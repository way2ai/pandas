package rbac

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
)

type sessionGetter interface {
	SessionByID(id string) (auth.Session, error)
}

func RequireRole(cookieName string, sessions sessionGetter, allow func(string) bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(cookieName)
		if err != nil || cookie.Value == "" {
			httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"error": map[string]string{
					"code":    "unauthenticated",
					"message": "missing session",
				},
			})
			return
		}

		currentSession, err := sessions.SessionByID(cookie.Value)
		if err != nil {
			httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"error": map[string]string{
					"code":    "unauthenticated",
					"message": "session not found",
				},
			})
			return
		}

		if !allow(currentSession.SystemRole) {
			httpx.WriteJSON(w, http.StatusForbidden, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"error": map[string]string{
					"code":    "forbidden",
					"message": "insufficient role",
				},
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}
