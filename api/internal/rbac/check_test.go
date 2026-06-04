package rbac_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/rbac"
)

func TestTenantAdminCannotAccessPlatformAdminArea(t *testing.T) {
	if rbac.CanAccessAdmin("tenant_admin") {
		t.Fatal("tenant admin must not access platform admin area")
	}
}

func TestPersonalUserCanAccessAppArea(t *testing.T) {
	if !rbac.CanAccessApp("personal_user") {
		t.Fatal("personal user must access app area")
	}
}
