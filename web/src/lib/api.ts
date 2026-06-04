export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.WEB_API_BASE_URL ?? "http://localhost:8080";

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  return response.json() as Promise<T>;
}
