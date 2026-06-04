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
	"github.com/way2ai/pandas/api/internal/memberships"
	"github.com/way2ai/pandas/api/internal/platform"
	"github.com/way2ai/pandas/api/internal/rbac"
	"github.com/way2ai/pandas/api/internal/tenant"
)

func main() {
	cfg := config.Load()
	authService := auth.NewInMemoryService()
	auditService := &audit.InMemoryService{}
	if err := authService.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		log.Fatal(err)
	}
	membershipHandler := memberships.NewHandler(auditService)

	mux := http.NewServeMux()
	auth.NewHandler(authService, cfg.SessionCookieName, cfg.SessionCookieSecure).Mount(mux)
	mux.Handle("/api/v1/health/", health.NewHandler())
	mux.Handle("/api/v1/app/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessApp, app.Handler()))
	mux.Handle("/api/v1/tenant/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, tenant.HomeHandler()))
	mux.Handle("/api/v1/tenant/members", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, membershipHandler.MembersHandler()))
	mux.Handle("/api/v1/tenant/members/invitations", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessTenant, membershipHandler.InvitationHandler()))
	mux.Handle("/api/v1/admin/home", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, platform.HomeHandler()))
	mux.Handle("/api/v1/admin/users", rbac.RequireRole(cfg.SessionCookieName, authService, rbac.CanAccessAdmin, platform.UsersHandler(authService)))
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
