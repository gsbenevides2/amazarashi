import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (
    request.headers.get("Authorization") !==
    `Bearer ${process.env.ISG_INVALIDATION_TOKEN}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/");
  revalidatePath("/album/[slug]");
  revalidatePath("/music/[slug]");
  return new Response("OK");
}
