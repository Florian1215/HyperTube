package main

import (
	"context"
	_ "embed"
	"log"
	"net/http"
	"os"
	"time"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/comments"
	"hypertube/api/internal/email"
	"hypertube/api/internal/movies"
	"hypertube/api/internal/movies/archive.org"
	"hypertube/api/internal/movies/c411"
	"hypertube/api/internal/movies/tmdb"
	"hypertube/api/internal/stream"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	db := connectDB(ctx)
	defer db.Close()

	tokenManager, err := auth.NewTokenManager(os.Getenv("JWT_SECRET"), getEnv("JWT_ISSUER", "hypertube-api"))
	if err != nil {
		log.Fatalf("init JWT manager: %v", err)
	}

	authStore := auth.NewStore(db)
	fortyTwoRedirectURL := getEnv("FORTYTWO_REDIRECT_URL", "http://localhost:8080/api/v1/auth/42/callback")
	githubRedirectURL := getEnv("GITHUB_REDIRECT_URL", "http://localhost:8080/api/v1/auth/github/callback")
	gitlabRedirectURL := getEnv("GITLAB_REDIRECT_URL", "http://localhost:8080/api/v1/auth/gitlab/callback")
	authOptions := []auth.HandlerOption{
		auth.WithFrontendAuthCallbackURL(getEnv("FRONTEND_AUTH_CALLBACK_URL", "http://localhost:4200/en/auth/callback")),
		auth.WithPasswordResetURL(getEnv("PASSWORD_RESET_URL", "http://localhost:4200/{locale}/reset-password")),
		auth.WithPasswordResetTTL(getPasswordResetTTL()),
		auth.WithFortyTwoOAuth(auth.NewFortyTwoOAuth(auth.FortyTwoOAuthConfig{
			ClientID:     os.Getenv("FORTYTWO_CLIENT_ID"),
			ClientSecret: os.Getenv("FORTYTWO_CLIENT_SECRET"),
			RedirectURL:  fortyTwoRedirectURL,
		})),
		auth.WithGitHubOAuth(auth.NewGitHubOAuth(auth.GitHubOAuthConfig{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  githubRedirectURL,
		})),
		auth.WithGitLabOAuth(auth.NewGitLabOAuth(auth.GitLabOAuthConfig{
			ClientID:     os.Getenv("GITLAB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITLAB_CLIENT_SECRET"),
			RedirectURL:  gitlabRedirectURL,
		})),
	}
	if passwordResetMailer := newPasswordResetMailer(); passwordResetMailer != nil {
		authOptions = append(authOptions, auth.WithPasswordResetMailer(passwordResetMailer))
	}
	authHandler := auth.NewHandler(authStore, tokenManager, authOptions...)

	movieStore := movies.NewStore(db)
	commentStore := comments.NewStore(db)

	c411Client, err := c411.NewClient()
	if err != nil {
		log.Fatalf("init C411 client: %v", err)
	}
	archiveClient, err := archiveorg.NewClient()
	if err != nil {
		log.Fatalf("init archive.org client: %v", err)
	}
	tmdbClient, err := tmdb.NewClient()
	if err != nil {
		log.Fatalf("init TMDB client: %v", err)
	}

	seedFeatured(ctx, c411Client, tmdbClient, movieStore)

	searchers := []movies.MovieSearcher{c411Client, archiveClient}
	moviesHandler := movies.NewMoviesHandler(movieStore, searchers, tmdbClient)
	commentsHandler := comments.NewCommentsHandler(commentStore)
	streamHandler := stream.NewStreamHandler()

	addr := ":" + getEnv("PORT", "8080")
	log.Printf("api listening on %s", addr)
	allowedOrigin := getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:4200")
	log.Fatal(http.ListenAndServe(addr, newRouter(moviesHandler, commentsHandler, authHandler, tokenManager, streamHandler, allowedOrigin)))

}

func connectDB(ctx context.Context) *pgxpool.Pool {
	db, err := pgxpool.New(ctx, getEnv("DATABASE_URL", "postgres://hypertube:changeme@localhost:5432/hypertube?sslmode=disable"))
	if err != nil {
		log.Fatalf("connect to db: %v", err)
	}
	if err := db.Ping(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
	}
	ensureSchema(ctx, db)
	log.Println("connected to database")
	return db
}

func ensureSchema(ctx context.Context, db *pgxpool.Pool) {
	if _, err := db.Exec(ctx, `CREATE EXTENSION IF NOT EXISTS citext`); err != nil {
		log.Fatalf("migrate citext extension: %v", err)
	}
	if _, err := db.Exec(ctx, `
		ALTER TABLE users
			ADD COLUMN IF NOT EXISTS email CITEXT,
			ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
			ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '',
			ADD COLUMN IF NOT EXISTS password_hash TEXT,
			ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	`); err != nil {
		log.Fatalf("migrate users auth columns: %v", err)
	}
	if _, err := db.Exec(ctx, `UPDATE users SET email = username || '@placeholder.invalid' WHERE email IS NULL`); err != nil {
		log.Fatalf("migrate users email placeholders: %v", err)
	}
	if _, err := db.Exec(ctx, `
		ALTER TABLE users
			ALTER COLUMN email SET NOT NULL,
			ALTER COLUMN first_name DROP DEFAULT,
			ALTER COLUMN last_name DROP DEFAULT
	`); err != nil {
		log.Fatalf("migrate users auth column constraints: %v", err)
	}
	if _, err := db.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT`); err != nil {
		log.Fatalf("migrate users.profile_picture: %v", err)
	}
	if _, err := db.Exec(ctx, `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`); err != nil {
		log.Fatalf("migrate users email constraint: %v", err)
	}
	if _, err := db.Exec(ctx, `DROP INDEX IF EXISTS users_email_key`); err != nil {
		log.Fatalf("migrate users email index: %v", err)
	}
	if _, err := db.Exec(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS users_password_email_key ON users (email) WHERE COALESCE(password_hash, '') <> ''`); err != nil {
		log.Fatalf("migrate users password email index: %v", err)
	}
	if _, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS oauth_accounts (
			id               SERIAL PRIMARY KEY,
			user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			provider         TEXT        NOT NULL,
			provider_user_id TEXT        NOT NULL,
			provider_email   CITEXT,
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (provider, provider_user_id),
			UNIQUE (user_id, provider)
		)
	`); err != nil {
		log.Fatalf("migrate oauth_accounts: %v", err)
	}
}

func seedFeatured(ctx context.Context, c411Client *c411.Client, tmdbClient *tmdb.Client, store *movies.Store) {
	featured, err := c411Client.GetTopMovies(ctx)
	if err != nil {
		log.Printf("startup: failed to fetch top movies: %v", err)
		return
	}
	log.Printf("startup: top %d movies by seeds:", len(featured))
	for _, t := range featured {
		log.Printf("  imdb=%s seeds=%s title=%s", t.ImdbID, t.Seeds, t.Title)
	}
	for i, torrent := range featured {
		movie, err := tmdbClient.FindByIMDBID(ctx, torrent.ImdbID)
		if err != nil {
			log.Printf("TMDB lookup error for IMDb ID %s: %v", torrent.ImdbID, err)
			continue
		}
		if err = store.UpsertMovie(ctx, movie); err != nil {
			log.Fatalf("startup: db err: %v", err)
		}
		if err = store.UpsertTorrent(ctx, torrent); err != nil {
			log.Printf("startup: failed to store torrent %s: %v", torrent.Title, err)
		}
		if err = store.UpsertFeatured(ctx, torrent.ImdbID, i); err != nil {
			log.Printf("startup: failed to store featured torrent %s: %v", torrent.Title, err)
		}
	}
}

func newRouter(
	moviesHandler *movies.MoviesHandler,
	commentsHandler *comments.CommentsHandler,
	authHandler *auth.Handler,
	tokenManager *auth.TokenManager,
	streamHandler *stream.StreamHandler,
	allowedOrigin string,
) chi.Router {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{allowedOrigin},
		AllowedMethods: []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
		MaxAge:         600,
	}))

	////
	// MOCKUP for dev and TEST purposes

	r.Get("/mockup-rubber", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(mockupRubberHTML)
	})
	r.Get("/mockup-batman", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(mockupBatmanHTML)
	})
	// MOCKUP for dev and TEST purposes
	////

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/password-reset", authHandler.RequestPasswordReset)
			r.Post("/reset-password", authHandler.ResetPassword)
			r.Get("/42/login", authHandler.LoginFortyTwo)
			r.Get("/42/callback", authHandler.CallbackFortyTwo)
			r.Get("/github/login", authHandler.LoginGitHub)
			r.Get("/github/callback", authHandler.CallbackGitHub)
			r.Get("/gitlab/login", authHandler.LoginGitLab)
			r.Get("/gitlab/callback", authHandler.CallbackGitLab)
		})

		r.Post("/oauth/token", authHandler.OAuthToken)

		r.Get("/movies", moviesHandler.GetMovies)

		// temporarly not protected for dev purposes
		r.Get("/stream/{id}", streamHandler.InitStream)           // start torrent and prepapre for trancoding and streaming
		r.Get("/stream/{id}/index", streamHandler.GetIndex)       // serve the HLS index
		r.Get("/stream/{id}/{segment}", streamHandler.GetSegment) // serve the HLS segments

		r.Group(func(r chi.Router) {
			// Dev-only: keep formerly protected routes reachable while the frontend is built out.
			// Switch back to auth.RequireAuth(tokenManager) before enabling production auth.
			r.Use(auth.DevAuthenticateAs(1))
			// r.Use(auth.RequireAuth(tokenManager))

			r.Get("/movies/watched", moviesHandler.GetWatchedMovies)
			r.Get("/movies/directstream", moviesHandler.GetDirectStreamMovies)
			r.Get("/movies/search", moviesHandler.SearchMovies)
			r.Get("/movies/{id}", moviesHandler.GetMoviesId)
			r.Get("/movies/{id}/torrents", moviesHandler.GetMovieTorrents)
			r.Get("/movies/{id}/comments", moviesHandler.GetComments)
			r.Post("/movies/{id}/comments", moviesHandler.PostComment)

			r.Get("/comments", commentsHandler.List)
			r.Get("/comments/{id}", commentsHandler.Get)
			r.Patch("/comments/{id}", commentsHandler.Update)
			r.Delete("/comments/{id}", commentsHandler.Delete)

			// r.Get("/stream/{id}", streamHandler.InitStream) // start torrent and prepapre for trancoding and streaming
			// r.Get("/stream/{id}/index", streamHandler.GetIndex) // serve the HLS index
			// r.Get("/stream/{id}/{segment}", streamHandler.GetSegment) // serve the HLS segments

		})
	})

	// Backward-compatible callback path for the original environment template.
	r.Get("/oauth/callback/42", authHandler.CallbackFortyTwo)
	r.Get("/oauth/callback/github", authHandler.CallbackGitHub)
	r.Get("/oauth/callback/gitlab", authHandler.CallbackGitLab)
	r.Post("/oauth/token", authHandler.OAuthToken)

	return r
}

func newPasswordResetMailer() *email.BrevoMailer {
	if os.Getenv("BREVO_API_KEY") == "" {
		return nil
	}
	mailer, err := email.NewBrevoMailer(email.BrevoConfig{
		APIKey:    os.Getenv("BREVO_API_KEY"),
		FromEmail: os.Getenv("MAIL_FROM_EMAIL"),
		FromName:  os.Getenv("MAIL_FROM_NAME"),
	})
	if err != nil {
		log.Fatalf("init Brevo mailer: %v", err)
	}
	return mailer
}

func getPasswordResetTTL() time.Duration {
	rawTTL := os.Getenv("PASSWORD_RESET_TTL")
	if rawTTL == "" {
		return 30 * time.Minute
	}
	ttl, err := time.ParseDuration(rawTTL)
	if err != nil {
		log.Fatalf("parse PASSWORD_RESET_TTL: %v", err)
	}
	return ttl
}

//go:embed mockup_rubber.html
var mockupRubberHTML []byte

//go:embed mockup_batman.html
var mockupBatmanHTML []byte

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
