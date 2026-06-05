import { proxyAuthRequest } from "../../../../../../lib/auth-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return proxyAuthRequest(request, `/api/v1/app/knowledge-bases/${id}/documents`);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return proxyAuthRequest(request, `/api/v1/app/knowledge-bases/${id}/documents`);
}
