package knowledgebases

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/rbac"
)

type Handler struct {
	service *Service
	audit   *audit.InMemoryService
}

type createRequest struct {
	Name string `json:"name"`
}

type documentRequest struct {
	Name       string `json:"name"`
	SourceType string `json:"source_type"`
	SourceURI  string `json:"source_uri"`
}

func NewHandler(service *Service, auditService *audit.InMemoryService) *Handler {
	return &Handler{
		service: service,
		audit:   auditService,
	}
}

func (h *Handler) AppKnowledgeBasesHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		currentSession, ok := rbac.SessionFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, httpx.TraceID(r.Context()), "unauthenticated", "missing session")
			return
		}

		switch r.Method {
		case http.MethodGet:
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     h.service.ListForApp(currentSession),
			})
		case http.MethodPost:
			if currentSession.SystemRole != "personal_user" {
				httpx.WriteError(w, http.StatusForbidden, httpx.TraceID(r.Context()), "forbidden", "personal workspace only")
				return
			}
			var req createRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "invalid request body")
				return
			}
			req.Name = strings.TrimSpace(req.Name)
			if req.Name == "" {
				httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "knowledge base name is required")
				return
			}

			record := h.service.CreatePersonal(currentSession.UserEmail, req.Name)
			h.recordAudit("knowledge_base_create", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     record,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) TenantKnowledgeBasesHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     h.service.ListForTenant(),
			})
		case http.MethodPost:
			var req createRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "invalid request body")
				return
			}
			req.Name = strings.TrimSpace(req.Name)
			if req.Name == "" {
				httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "knowledge base name is required")
				return
			}

			record := h.service.CreateTenant(req.Name)
			h.recordAudit("knowledge_base_create", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     record,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) AdminKnowledgeBasesHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data":     h.service.ListAll(),
		})
	})
}

func (h *Handler) AppKnowledgeBaseDocumentsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		currentSession, ok := rbac.SessionFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, httpx.TraceID(r.Context()), "unauthenticated", "missing session")
			return
		}

		knowledgeBaseID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/app/knowledge-bases/"), "/documents")
		switch r.Method {
		case http.MethodGet:
			documents, err := h.service.ListDocumentsForApp(currentSession, knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     documents,
			})
		case http.MethodPost:
			if currentSession.SystemRole != "personal_user" {
				httpx.WriteError(w, http.StatusForbidden, httpx.TraceID(r.Context()), "forbidden", "personal workspace only")
				return
			}
			req, ok := h.decodeDocumentRequest(w, r)
			if !ok {
				return
			}
			document, err := h.service.CreatePersonalDocument(currentSession.UserEmail, knowledgeBaseID, req.Name, req.SourceType, req.SourceURI)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			h.recordAudit("knowledge_document_create", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     document,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) AppKnowledgeBaseBuildsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		currentSession, ok := rbac.SessionFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, httpx.TraceID(r.Context()), "unauthenticated", "missing session")
			return
		}

		knowledgeBaseID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/app/knowledge-bases/"), "/builds")
		switch r.Method {
		case http.MethodGet:
			builds, err := h.service.ListBuildsForApp(currentSession, knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     builds,
			})
		case http.MethodPost:
			if currentSession.SystemRole != "personal_user" {
				httpx.WriteError(w, http.StatusForbidden, httpx.TraceID(r.Context()), "forbidden", "personal workspace only")
				return
			}
			build, err := h.service.QueuePersonalBuild(currentSession.UserEmail, knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			h.recordAudit("knowledge_base_build_queue", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     build,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) TenantKnowledgeBaseDocumentsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		knowledgeBaseID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/tenant/knowledge-bases/"), "/documents")
		switch r.Method {
		case http.MethodGet:
			documents, err := h.service.ListDocumentsForTenant(knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     documents,
			})
		case http.MethodPost:
			req, ok := h.decodeDocumentRequest(w, r)
			if !ok {
				return
			}
			document, err := h.service.CreateTenantDocument(knowledgeBaseID, req.Name, req.SourceType, req.SourceURI)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			h.recordAudit("knowledge_document_create", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     document,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) TenantKnowledgeBaseBuildsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		knowledgeBaseID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/tenant/knowledge-bases/"), "/builds")
		switch r.Method {
		case http.MethodGet:
			builds, err := h.service.ListBuildsForTenant(knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     builds,
			})
		case http.MethodPost:
			build, err := h.service.QueueTenantBuild(knowledgeBaseID)
			if err != nil {
				h.writeKnowledgeBaseError(w, r, err)
				return
			}
			h.recordAudit("knowledge_base_build_queue", "success", httpx.TraceID(r.Context()))
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{
				"trace_id": httpx.TraceID(r.Context()),
				"data":     build,
			})
		default:
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
		}
	})
}

func (h *Handler) AdminBuildsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data":     h.service.ListAllBuilds(),
		})
	})
}

func (h *Handler) AdminBuildActionHandler(action string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpx.WriteError(w, http.StatusMethodNotAllowed, httpx.TraceID(r.Context()), "method_not_allowed", "method not allowed")
			return
		}

		buildID := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/builds/")
		buildID = strings.TrimSuffix(buildID, "/retry")
		buildID = strings.TrimSuffix(buildID, "/cancel")
		if buildID == "" {
			httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "missing build identifier")
			return
		}

		var (
			build BuildTask
			err   error
		)
		switch action {
		case "retry":
			build, err = h.service.RetryBuild(buildID)
		case "cancel":
			build, err = h.service.CancelBuild(buildID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, httpx.TraceID(r.Context()), "internal_error", "unsupported build action")
			return
		}
		if err != nil {
			h.writeBuildError(w, r, err)
			return
		}

		h.recordAudit("knowledge_base_build_"+action, "success", httpx.TraceID(r.Context()))
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data":     build,
		})
	})
}

func (h *Handler) recordAudit(action, result, traceID string) {
	if h.audit == nil {
		return
	}
	h.audit.Record(audit.Event{
		Action:  action,
		Result:  result,
		TraceID: traceID,
	})
}

func (h *Handler) decodeDocumentRequest(w http.ResponseWriter, r *http.Request) (documentRequest, bool) {
	var req documentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "invalid request body")
		return documentRequest{}, false
	}

	req.Name = strings.TrimSpace(req.Name)
	req.SourceType = strings.TrimSpace(req.SourceType)
	req.SourceURI = strings.TrimSpace(req.SourceURI)
	if req.Name == "" || req.SourceType == "" {
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "document name and source type are required")
		return documentRequest{}, false
	}
	if req.SourceType == "url" && req.SourceURI == "" {
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "source uri is required for url documents")
		return documentRequest{}, false
	}
	if req.SourceType != "file" && req.SourceType != "url" {
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", "unsupported source type")
		return documentRequest{}, false
	}

	return req, true
}

func (h *Handler) writeKnowledgeBaseError(w http.ResponseWriter, r *http.Request, err error) {
	switch err {
	case ErrKnowledgeBaseNotFound:
		httpx.WriteError(w, http.StatusNotFound, httpx.TraceID(r.Context()), "not_found", err.Error())
	case ErrKnowledgeBaseAccess:
		httpx.WriteError(w, http.StatusForbidden, httpx.TraceID(r.Context()), "forbidden", err.Error())
	case ErrKnowledgeBaseEmpty:
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", err.Error())
	default:
		httpx.WriteError(w, http.StatusInternalServerError, httpx.TraceID(r.Context()), "internal_error", "knowledge base operation failed")
	}
}

func (h *Handler) writeBuildError(w http.ResponseWriter, r *http.Request, err error) {
	switch err {
	case ErrBuildNotFound:
		httpx.WriteError(w, http.StatusNotFound, httpx.TraceID(r.Context()), "not_found", err.Error())
	case ErrBuildNotRetryable, ErrBuildNotCancellable:
		httpx.WriteError(w, http.StatusBadRequest, httpx.TraceID(r.Context()), "bad_request", err.Error())
	default:
		httpx.WriteError(w, http.StatusInternalServerError, httpx.TraceID(r.Context()), "internal_error", "build operation failed")
	}
}
