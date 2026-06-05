package auth_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/auth"
)

func TestLoginReturnsSessionForActiveUser(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if currentSession.ID == "" {
		t.Fatal("expected session id")
	}
}

func TestLoginRejectsDisabledUser(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("disabled@example.com", "disabled", "password123", "personal_user", "disabled"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	_, err := service.Login("disabled@example.com", "password123", "127.0.0.1")
	if err == nil || err.Error() != auth.ErrUserDisabled.Error() {
		t.Fatalf("expected %q, got %v", auth.ErrUserDisabled.Error(), err)
	}
}

func TestSessionByIDReturnsStoredSession(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	found, err := service.SessionByID(currentSession.ID)
	if err != nil {
		t.Fatalf("session lookup: %v", err)
	}
	if found.UserEmail != "admin@example.com" {
		t.Fatalf("expected session email admin@example.com, got %s", found.UserEmail)
	}
}

func TestLogoutRemovesSession(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	service.Logout(currentSession.ID)

	_, err = service.SessionByID(currentSession.ID)
	if err == nil || err.Error() != auth.ErrSessionNotFound.Error() {
		t.Fatalf("expected %q, got %v", auth.ErrSessionNotFound.Error(), err)
	}
}

func TestDisableUserRevokesExistingSessions(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	if err := service.SetUserStatus("admin@example.com", "disabled"); err != nil {
		t.Fatalf("disable user: %v", err)
	}

	_, err = service.SessionByID(currentSession.ID)
	if err == nil || err.Error() != auth.ErrSessionNotFound.Error() {
		t.Fatalf("expected %q, got %v", auth.ErrSessionNotFound.Error(), err)
	}
}
