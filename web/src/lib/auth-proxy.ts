import { API_BASE_URL } from "./api";

export async function proxyAuthRequest(request: Request, path: string): Promise<Response> {
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    const cookie = request.headers.get("cookie");

    const upstream = await fetch(`${API_BASE_URL}${path}`, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });

    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "upstream_unavailable",
          message: "authentication service unavailable",
        },
      },
      { status: 502 },
    );
  }
}
