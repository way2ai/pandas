import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export async function updateUserStatus(request: Request, identifier: string, status: "active" | "disabled"): Promise<Response> {
  const path = `/api/v1/admin/users/${encodeURIComponent(identifier)}/${status === "active" ? "enable" : "disable"}`;
  return proxyAuthRequest(request, path);
}
