package platform

import (
	"net/http"
	"strings"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
)

func HomeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{
				"area": "admin",
			},
		})
	})
}

func UsersHandler(service *auth.InMemoryService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		users := []map[string]string{}
		if service != nil {
			for _, user := range service.Users() {
				users = append(users, map[string]string{
					"email":       user.Email,
					"username":    user.Username,
					"system_role": user.SystemRole,
					"status":      user.Status,
				})
			}
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data":     users,
		})
	})
}

func TenantsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": []map[string]string{
				{
					"id":     "tenant-demo",
					"name":   "Demo Tenant",
					"status": "active",
				},
			},
		})
	})
}

func UpdateUserStatusHandler(service *auth.InMemoryService, auditService *audit.InMemoryService, status string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		identifier := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/users/")
		identifier = strings.TrimSuffix(identifier, "/disable")
		identifier = strings.TrimSuffix(identifier, "/enable")
		if identifier == "" {
			httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "missing user identifier")
			return
		}

		if err := service.SetUserStatus(identifier, status); err != nil {
			httpx.WriteError(w, http.StatusNotFound, httpx.TraceID(r.Context()), "not_found", err.Error())
			return
		}

		if auditService != nil {
			action := "user_enable"
			if status == "disabled" {
				action = "user_disable"
			}
			auditService.Record(audit.Event{
				Action:  action,
				Result:  "success",
				TraceID: httpx.TraceID(r.Context()),
			})
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{
				"identifier": identifier,
				"status":     status,
			},
		})
	})
}
