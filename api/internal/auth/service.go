package auth

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/way2ai/pandas/api/internal/throttle"
)

var (
	ErrInvalidCredentials = errors.New("invalid_credentials")
	ErrUserDisabled       = errors.New("user_disabled")
	ErrRateLimited        = errors.New("rate_limited")
	ErrSessionNotFound    = errors.New("session_not_found")
	ErrUserNotFound       = errors.New("user_not_found")
)

type Session struct {
	ID         string
	UserEmail  string
	SystemRole string
	ExpiresAt  time.Time
}

type User struct {
	Email        string
	Username     string
	PasswordHash string
	SystemRole   string
	Status       string
}

type InMemoryService struct {
	mu       sync.RWMutex
	users    map[string]User
	sessions map[string]Session
	limiter  *throttle.MemoryLimiter
}

func NewInMemoryService() *InMemoryService {
	return &InMemoryService{
		users:    map[string]User{},
		sessions: map[string]Session{},
		limiter:  throttle.NewMemoryLimiter(5, 15*time.Minute),
	}
}

func (s *InMemoryService) SeedUser(email, username, password, role, status string) error {
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user := User{
		Email:        email,
		Username:     username,
		PasswordHash: hash,
		SystemRole:   role,
		Status:       status,
	}
	s.users[email] = user
	s.users[username] = user
	return nil
}

func (s *InMemoryService) Users() []User {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]User, 0, len(s.users))
	seen := map[string]struct{}{}
	for _, user := range s.users {
		if _, ok := seen[user.Email]; ok {
			continue
		}
		seen[user.Email] = struct{}{}
		result = append(result, user)
	}
	return result
}

func (s *InMemoryService) SetUserStatus(identifier, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, ok := s.users[identifier]
	if !ok {
		return ErrUserNotFound
	}

	user.Status = status
	s.users[user.Email] = user
	s.users[user.Username] = user
	if status != "active" {
		for sessionID, currentSession := range s.sessions {
			if currentSession.UserEmail == user.Email {
				delete(s.sessions, sessionID)
			}
		}
	}
	return nil
}

func (s *InMemoryService) Login(identifier, password, ip string) (Session, error) {
	if s.limiter.Blocked(identifier) || s.limiter.Blocked(ip) {
		return Session{}, ErrRateLimited
	}

	s.mu.RLock()
	user, ok := s.users[identifier]
	s.mu.RUnlock()
	if !ok || !CheckPassword(user.PasswordHash, password) {
		s.limiter.RecordFailure(identifier)
		s.limiter.RecordFailure(ip)
		return Session{}, ErrInvalidCredentials
	}
	if user.Status != "active" {
		return Session{}, ErrUserDisabled
	}

	s.limiter.Reset(identifier)
	s.limiter.Reset(ip)

	session := Session{
		ID:         fmt.Sprintf("%s-session", identifier),
		UserEmail:  user.Email,
		SystemRole: user.SystemRole,
		ExpiresAt:  time.Now().Add(24 * time.Hour),
	}

	s.mu.Lock()
	s.sessions[session.ID] = session
	s.mu.Unlock()

	return session, nil
}

func (s *InMemoryService) SessionByID(id string) (Session, error) {
	s.mu.RLock()
	session, ok := s.sessions[id]
	if !ok {
		s.mu.RUnlock()
		return Session{}, ErrSessionNotFound
	}
	if session.ExpiresAt.Before(time.Now()) {
		s.mu.RUnlock()
		return Session{}, ErrSessionNotFound
	}
	user, ok := s.users[session.UserEmail]
	s.mu.RUnlock()
	if !ok || user.Status != "active" {
		return Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *InMemoryService) Logout(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}
