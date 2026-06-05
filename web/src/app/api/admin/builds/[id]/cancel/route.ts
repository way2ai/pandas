import { updateBuildStatus } from "../../action-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return updateBuildStatus(request, id, "cancel");
}
