package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/way2ai/pandas/api/internal/app"
	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/config"
	"github.com/way2ai/pandas/api/internal/health"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/knowledgebases"
	"github.com/way2ai/pandas/api/internal/memberships"
	"github.com/way2ai/pandas/api/internal/platform"
	"github.com/way2ai/pandas/api/internal/rbac"
	"github.com/way2ai/pandas/api/internal/tenant"
)

func main() {
	cfg := config.Load()
	authService := auth.NewInMemoryService()
	auditService := &audit.InMemoryService{}
	seedDemoUsers(authService)
	knowledgeBaseHandler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), auditService)
	membershipHandler := memberships.NewHandler(auditService)

	mux := http.NewServeMux()
	auth.NewHandler(authService, cfg.SessionCookieName, cfg.SessionCookieSecure, auditService).Mount(mux)
	mux.Handle("/api/v1/health/", health.NewHandler())
	mux.Handle("/api/v1/app/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessApp, app.Handler()))
	mux.Handle("/api/v1/app/knowledge-bases", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessApp, knowledgeBaseHandler.AppKnowledgeBasesHandler()))
	mux.Handle("/api/v1/app/knowledge-bases/", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessApp, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/documents"):
			knowledgeBaseHandler.AppKnowledgeBaseDocumentsHandler().ServeHTTP(w, r)
		case strings.HasSuffix(r.URL.Path, "/builds"):
			knowledgeBaseHandler.AppKnowledgeBaseBuildsHandler().ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})))
	mux.Handle("/api/v1/tenant/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, tenant.HomeHandler()))
	mux.Handle("/api/v1/tenant/members", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, membershipHandler.MembersHandler()))
	mux.Handle("/api/v1/tenant/members/invitations", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, membershipHandler.InvitationHandler()))
	mux.Handle("/api/v1/tenant/knowledge-bases", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, knowledgeBaseHandler.TenantKnowledgeBasesHandler()))
	mux.Handle("/api/v1/tenant/knowledge-bases/", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/documents"):
			knowledgeBaseHandler.TenantKnowledgeBaseDocumentsHandler().ServeHTTP(w, r)
		case strings.HasSuffix(r.URL.Path, "/builds"):
			knowledgeBaseHandler.TenantKnowledgeBaseBuildsHandler().ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})))
	mux.Handle("/api/v1/admin/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, platform.HomeHandler()))
	mux.Handle("/api/v1/admin/users", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, platform.UsersHandler(authService)))
	mux.Handle("/api/v1/admin/knowledge-bases", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, knowledgeBaseHandler.AdminKnowledgeBasesHandler()))
	mux.Handle("/api/v1/admin/builds", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, knowledgeBaseHandler.AdminBuildsHandler()))
	mux.Handle("/api/v1/admin/builds/", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/retry"):
			knowledgeBaseHandler.AdminBuildActionHandler("retry").ServeHTTP(w, r)
		case strings.HasSuffix(r.URL.Path, "/cancel"):
			knowledgeBaseHandler.AdminBuildActionHandler("cancel").ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})))
	mux.Handle("/api/v1/admin/users/", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/admin/users/":
			http.NotFound(w, r)
		case strings.HasSuffix(r.URL.Path, "/disable"):
			platform.UpdateUserStatusHandler(authService, auditService, "disabled").ServeHTTP(w, r)
		case strings.HasSuffix(r.URL.Path, "/enable"):
			platform.UpdateUserStatusHandler(authService, auditService, "active").ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})))
	mux.Handle("/api/v1/admin/tenants", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, platform.TenantsHandler()))

	log.Fatal(http.ListenAndServe(cfg.HTTPAddr, httpx.WithTrace(mux)))
}

func seedDemoUsers(service *auth.InMemoryService) {
	users := []struct {
		email    string
		username string
		role     string
	}{
		{email: "admin@example.com", username: "admin", role: "platform_admin"},
		{email: "tenant-admin@example.com", username: "tenant-admin", role: "tenant_admin"},
		{email: "member@example.com", username: "member", role: "tenant_member"},
		{email: "user@example.com", username: "user", role: "personal_user"},
	}

	for _, user := range users {
		if err := service.SeedUser(user.email, user.username, "password123", user.role, "active"); err != nil {
			log.Fatal(err)
		}
	}
}
