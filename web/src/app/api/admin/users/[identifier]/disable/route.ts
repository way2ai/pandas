import { updateUserStatus } from "../../status-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
): Promise<Response> {
  const { identifier } = await context.params;
  return updateUserStatus(request, identifier, "disabled");
}
