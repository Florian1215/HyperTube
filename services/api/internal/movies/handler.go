package movies

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/i18n"
	"hypertube/api/internal/models"
	"hypertube/api/internal/respond"
)

type MoviesHandler struct {
	store     movieStore
	searchers []MovieSearcher
	tmdb      tmdbClient
}

type movieStore interface {
	listDefault(ctx context.Context) ([]models.Movie, error)
	listFeatured(ctx context.Context) ([]models.Movie, error)
	findByID(ctx context.Context, id string) (*models.Movie, error)
	UpsertMovie(ctx context.Context, m models.Movie) error
	UpsertTorrent(ctx context.Context, ts models.Torrent) error
	findTorrent(ctx context.Context, imdbID string) ([]models.Torrent, error)
	listComments(ctx context.Context, imdbID string) ([]models.Comment, error)
	createComment(ctx context.Context, c models.Comment) (models.Comment, error)
	countSearchResults(ctx context.Context, query string) (int, error)
	upsertSearchResults(ctx context.Context, query string, imdbIDs []string) error
	listSearchResults(ctx context.Context, query string, limit, offset int) ([]models.Movie, error)
	listWatched(ctx context.Context, userID int) ([]models.Movie, error)
	listDirectStream(ctx context.Context) ([]models.Movie, error)
}

type MovieSearcher interface {
	SearchByTitle(ctx context.Context, title string) ([]models.Torrent, error)
	GetTopMovies(ctx context.Context) ([]models.Torrent, error)
}

type tmdbClient interface {
	FindByIMDBID(ctx context.Context, imdbID string) (models.Movie, error)
	GetMovieDetails(ctx context.Context, tmdbID string, language string) (models.MovieDetails, error)
	FindByName(ctx context.Context, title string, year int) (models.Movie, error)
}

func NewMoviesHandler(store movieStore, searchers []MovieSearcher, tmdb tmdbClient) *MoviesHandler {
	return &MoviesHandler{store: store, searchers: searchers, tmdb: tmdb}
}

// GetDefaultMovies returns a list of tracker wide popular movies.
func (h *MoviesHandler) GetDefaultMovies(w http.ResponseWriter, r *http.Request) {
	movies, err := h.store.listDefault(r.Context())
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadMovies)
		return
	}

	movieResponse := make([]movieResponse, len(movies))
	for i, m := range movies {
		movieResponse[i] = toMovieResponse(m)
	}
	respond.List(w, http.StatusOK, movieResponse)
}

// GetFeatured.Movies returns a list of curated movies
func (h *MoviesHandler) GetFeaturedMovies(w http.ResponseWriter, r *http.Request) {
	movies, err := h.store.listFeatured(r.Context())
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadMovies)
		return
	}

	movieResponse := make([]movieResponse, len(movies))
	for i, m := range movies {
		movieResponse[i] = toMovieResponse(m)
	}
	respond.List(w, http.StatusOK, movieResponse)
}

func (h *MoviesHandler) GetWatchedMovies(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	movies, err := h.store.listWatched(r.Context(), int(userID))
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadMovies)
		return
	}
	movieResponse := make([]movieResponse, len(movies))
	for i, m := range movies {
		movieResponse[i] = toMovieResponse(m)
	}
	respond.List(w, http.StatusOK, movieResponse)
}

func (h *MoviesHandler) GetDirectStreamMovies(w http.ResponseWriter, r *http.Request) {
	movies, err := h.store.listDirectStream(r.Context())
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadMovies)
		return
	}
	movieResponse := make([]movieResponse, len(movies))
	for i, m := range movies {
		movieResponse[i] = toMovieResponse(m)
	}
	respond.List(w, http.StatusOK, movieResponse)
}

// Get returns metadata for a single movie.
func (h *MoviesHandler) GetMoviesId(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	movie, err := h.store.findByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgMovieNotFound)
		} else {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadMovie)
		}
		return
	}
  
	locale := i18n.FromRequest(r)
	if r.Header.Get("Accept-Language") == "" && r.URL.Query().Get("lang") != "" {
		locale = i18n.FromValue(r.URL.Query().Get("lang"))
	}
	language := i18n.TMDBLanguage(locale)
	details, err := h.tmdb.GetMovieDetails(r.Context(), movie.TmdbID, language)
	if err != nil {
		log.Printf("TMDB details error for TmdbID %s: %v", movie.TmdbID, err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedFetchMovieDetails)
		return
	}
	respond.Item(w, http.StatusOK, toMovieDetailResponse(*movie, details))
}

func (h *MoviesHandler) collectTorrents(ctx context.Context, title string) ([]models.Torrent, error) {
	var mixed []models.Torrent
	for _, s := range h.searchers {
		torrents, err := s.SearchByTitle(ctx, title)
		if err != nil {
			return nil, err
		}
		mixed = append(mixed, torrents...)
	}
	return mixed, nil
}

func (h *MoviesHandler) resolveMovie(ctx context.Context, torrent models.Torrent) (models.Movie, models.Torrent, error) {
	if torrent.ImdbID == "none" {
		movie, err := h.tmdb.FindByName(ctx, torrent.Title, torrent.Year)
		if err != nil {
			return models.Movie{}, torrent, err
		}
		torrent.ImdbID = movie.ImdbID
		return movie, torrent, nil
	}
	movie, err := h.tmdb.FindByIMDBID(ctx, torrent.ImdbID)
	return movie, torrent, err
}

// Use a cold or warm path to search movie by title using cache.
func (h *MoviesHandler) SearchMovies(w http.ResponseWriter, r *http.Request) {
	const pagnationLimit = 12
	title := r.URL.Query().Get("title")
	if title == "" {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "title", i18n.MsgTitleQueryRequired)
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 0 {
		page = 0
	}

	// Warm path: search already in DB, serve directly
	total, err := h.store.countSearchResults(r.Context(), title)
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedCheckSearchCache)
		return
	}
	if total > 0 {
		movies, err := h.store.listSearchResults(r.Context(), title, pagnationLimit, page*pagnationLimit)
		if err != nil {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadSearchResults)
			return
		}
		result := make([]movieResponse, len(movies))
		for i, m := range movies {
			result[i] = toMovieResponse(m)
		}
		respond.ListPaginated(w, http.StatusOK, result, total, page, pagnationLimit)
		return
	}

	// Cold path: Scrape torrent sources
	torrents, err := h.collectTorrents(r.Context(), title)
	if err != nil {
		log.Println("search err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedSearchMovies)
		return
	}

	var allMovies []models.Movie
	imdbIdSeen := make(map[string]bool)

	for _, torrent := range torrents {
		if imdbIdSeen[torrent.ImdbID] {
			h.store.UpsertTorrent(r.Context(), torrent)
			continue
		}
		movie, torrent, err := h.resolveMovie(r.Context(), torrent)
		if err != nil {
			log.Printf("TMDB lookup error for %q: %v", torrent.Title, err)
			continue
		}
		if !imdbIdSeen[movie.ImdbID] {
			if err = h.store.UpsertMovie(r.Context(), movie); err != nil {
				log.Println("db err:", err)
				respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedStoreMovie)
				return
			}
			allMovies = append(allMovies, movie)
			imdbIdSeen[movie.ImdbID] = true
		}
		if err = h.store.UpsertTorrent(r.Context(), torrent); err != nil {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedStoreTorrent)
			return
		}
	}

	// Store the ordered search results so future pages can be served from DB
	imdbIDs := make([]string, len(allMovies))
	for i, m := range allMovies {
		imdbIDs[i] = m.ImdbID
	}
	if err := h.store.upsertSearchResults(r.Context(), title, imdbIDs); err != nil {
		log.Println("db err:", err)
	}

	// Return the sliced array
	start := page * pagnationLimit
	if start >= len(allMovies) {
		respond.ListPaginated(w, http.StatusOK, []movieResponse{}, len(allMovies), page, pagnationLimit)
		return
	}
	end := min(start+pagnationLimit, len(allMovies))
	result := make([]movieResponse, end-start)
	for i, m := range allMovies[start:end] {
		result[i] = toMovieResponse(m)
	}
	respond.ListPaginated(w, http.StatusOK, result, len(allMovies), page, pagnationLimit)
}

func (h *MoviesHandler) GetMovieTorrents(w http.ResponseWriter, r *http.Request) {
	imdbid := r.PathValue("id")
	torrents, err := h.store.findTorrent(r.Context(), imdbid)
	returnedTorrents := make([]torrentResponse, len(torrents))
	for i, t := range torrents {
		returnedTorrents[i] = toTorrentResponse(t)
	}
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgNoTrackerSource)
		} else {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadTrackerSource)
		}
		return
	}
	respond.List(w, http.StatusOK, returnedTorrents)
}

// ListComments returns comments for a movie.
func (h *MoviesHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	imdbid := r.PathValue("id")
	comments, err := h.store.listComments(r.Context(), imdbid)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgNoComments)
		} else {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedAccessComments)
		}
		return
	}
	respond.List(w, http.StatusOK, comments)
}

// CreateComment posts a new comment on a movie.
func (h *MoviesHandler) PostComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	var input struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("decode err:", err)
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidRequestBody)
		return
	}
	comment := models.Comment{
		UserID:  int(userID),
		MovieID: r.PathValue("id"),
		Content: input.Content,
	}
	if comment, err := h.store.createComment(r.Context(), comment); err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedCreateComment)
		return
	} else {
		respond.Item(w, http.StatusCreated, comment)
	}
}
