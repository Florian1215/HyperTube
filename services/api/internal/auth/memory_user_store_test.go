package auth

import (
	"context"
	"errors"
	"testing"
)

func TestMemoryUserStoreFindMissing(t *testing.T) {
	_, err := newMemoryUserStore().FindUserByEmail(context.Background(), "missing@example.com")
	if !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound, got %v", err)
	}
}

func TestOAuthUsersWithSameEmailStaySeparateByProvider(t *testing.T) {
	store := newMemoryUserStore()

	fortyTwoUser, err := store.FindOrCreateOAuthUser(context.Background(), OAuthUserParams{
		Provider:       fortyTwoProvider,
		ProviderUserID: "42-id",
		Email:          "same@example.com",
		Username:       "forty_two",
		FirstName:      "Forty",
		LastName:       "Two",
	})
	if err != nil {
		t.Fatalf("create 42 user: %v", err)
	}

	githubUser, err := store.FindOrCreateOAuthUser(context.Background(), OAuthUserParams{
		Provider:       githubProvider,
		ProviderUserID: "github-id",
		Email:          "same@example.com",
		Username:       "github_user",
		FirstName:      "Git",
		LastName:       "Hub",
	})
	if err != nil {
		t.Fatalf("create GitHub user: %v", err)
	}

	if githubUser.ID == fortyTwoUser.ID {
		t.Fatalf("expected separate OAuth users for matching provider email, got id %d", githubUser.ID)
	}
	if githubUser.FirstName != "Git" || githubUser.LastName != "Hub" {
		t.Fatalf("expected GitHub profile fields, got %+v", githubUser)
	}
}
