import { proxyAuthRequest } from "../../../../../lib/auth-proxy";

export async function POST(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/api/v1/tenant/members/invitations");
}
