export const SESSION_COOKIE_NAME = "platform_session";

export function hasSessionCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}
