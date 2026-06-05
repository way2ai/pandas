import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export async function updateBuildStatus(
  request: Request,
  identifier: string,
  action: "retry" | "cancel",
): Promise<Response> {
  const path = `/api/v1/admin/builds/${encodeURIComponent(identifier)}/${action}`;
  return proxyAuthRequest(request, path);
}
