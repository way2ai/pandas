package auth

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/session"
)

type Handler struct {
	service      *InMemoryService
	cookieName   string
	cookieSecure bool
}

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func NewHandler(service *InMemoryService, cookieName string, cookieSecure bool) *Handler {
	return &Handler{
		service:      service,
		cookieName:   cookieName,
		cookieSecure: cookieSecure,
	}
}

func (h *Handler) Mount(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/auth/login", h.handleLogin)
	mux.HandleFunc("/api/v1/auth/logout", h.handleLogout)
	mux.HandleFunc("/api/v1/auth/me", h.handleMe)
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "invalid request body")
		return
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}

	currentSession, err := h.service.Login(req.Identifier, req.Password, host)
	if err != nil {
		status := http.StatusUnauthorized
		code := "invalid_credentials"
		switch {
		case errors.Is(err, ErrRateLimited):
			status = http.StatusTooManyRequests
			code = "rate_limited"
		case errors.Is(err, ErrUserDisabled):
			code = "user_disabled"
		}

		httpx.WriteError(w, status, httpx.TraceID(r.Context()), code, err.Error())
		return
	}

	session.WriteSessionCookie(w, h.cookieName, currentSession.ID, h.cookieSecure)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"trace_id": httpx.TraceID(r.Context()),
		"data": map[string]any{
			"email":       currentSession.UserEmail,
			"system_role": currentSession.SystemRole,
			"expires_at":  currentSession.ExpiresAt,
		},
	})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		return
	}

	cookie, err := r.Cookie(h.cookieName)
	if err == nil && cookie.Value != "" {
		h.service.Logout(cookie.Value)
	}
	session.ClearSessionCookie(w, h.cookieName, h.cookieSecure)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"trace_id": httpx.TraceID(r.Context()),
		"data": map[string]string{
			"status": "logged_out",
		},
	})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		return
	}

	cookie, err := r.Cookie(h.cookieName)
	if err != nil || cookie.Value == "" {
		httpx.WriteError(w, http.StatusUnauthorized, httpx.TraceID(r.Context()), "unauthenticated", "missing session")
		return
	}

	currentSession, err := h.service.SessionByID(cookie.Value)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, httpx.TraceID(r.Context()), "unauthenticated", "session not found")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"trace_id": httpx.TraceID(r.Context()),
		"data": map[string]any{
			"email":       currentSession.UserEmail,
			"system_role": currentSession.SystemRole,
			"expires_at":  currentSession.ExpiresAt,
		},
	})
}
