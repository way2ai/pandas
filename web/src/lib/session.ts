export const SESSION_COOKIE_NAME = "platform_session";

export function hasSessionCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}

export function destinationForSystemRole(role: string | undefined): string {
  switch (role) {
    case "platform_admin":
      return "/admin";
    case "tenant_admin":
      return "/tenant";
    case "tenant_member":
    case "personal_user":
    default:
      return "/app";
  }
}

export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/app") || pathname.startsWith("/tenant") || pathname.startsWith("/admin");
}

export function canAccessPath(pathname: string, role: string | undefined): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "platform_admin";
  }

  if (pathname.startsWith("/tenant")) {
    return role === "tenant_admin";
  }

  if (pathname.startsWith("/app")) {
    return role === "platform_admin" || role === "tenant_admin" || role === "tenant_member" || role === "personal_user";
  }

  return true;
}
