import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (
    request.headers.get("Authorization") !==
    `Bearer ${process.env.ISG_INVALIDATION_TOKEN}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/", "page");
  revalidatePath("/album/[slug]", "page");
  revalidatePath("/music/[slug]", "page");
  revalidatePath("/lyrics/[slug]", "page");
  return new Response("OK");
}
