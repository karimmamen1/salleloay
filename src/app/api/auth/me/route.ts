import { jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";

export async function GET() {
  try {
    return Response.json({ data: await requireUser() });
  } catch (error) {
    return jsonError(error);
  }
}

