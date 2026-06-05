package memberships

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/httpx"
)

type Handler struct {
	audit *audit.InMemoryService
}

type invitationRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

var defaultMembers = []map[string]string{
	{
		"email":  "member@example.com",
		"role":   "tenant_member",
		"status": "active",
	},
}

func NewHandler(auditService *audit.InMemoryService) *Handler {
	return &Handler{audit: auditService}
}

func (h *Handler) InvitationHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		var req invitationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "invalid request body")
			return
		}
		req.Email = strings.TrimSpace(req.Email)
		req.Role = strings.TrimSpace(req.Role)
		if req.Email == "" || req.Role == "" {
			httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "email and role are required")
			return
		}

		traceID := httpx.TraceID(r.Context())
		if h.audit != nil {
			h.audit.Record(audit.Event{
				Action:  "tenant_invitation_create",
				Result:  "success",
				TraceID: traceID,
			})
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": traceID,
			"data": map[string]string{
				"email":  req.Email,
				"role":   req.Role,
				"status": "invited",
			},
		})
	})
}

func (h *Handler) MembersHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data":     defaultMembers,
		})
	})
}
