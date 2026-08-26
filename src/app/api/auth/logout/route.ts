import { assertSameOrigin, jsonError } from "@/lib/api/server";
import { deleteCurrentSession } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await deleteCurrentSession();
    return Response.json({ data: { ok: true } });
  } catch (error) {
    return jsonError(error);
  }
}

