package rbac

func CanAccessApp(role string) bool {
	return role == "platform_admin" || role == "tenant_admin" || role == "tenant_member" || role == "personal_user"
}

func CanAccessTenant(role string) bool {
	return role == "tenant_admin"
}

func CanAccessAdmin(role string) bool {
	return role == "platform_admin"
}
