import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/api/v1/tenant/knowledge-bases");
}

export async function POST(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/api/v1/tenant/knowledge-bases");
}
