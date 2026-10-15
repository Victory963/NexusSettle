import { NextResponse } from "next/server";
import { assertResourceUrl, explainResource, GeminiUnconfigured, ResourceUrlReject } from "@/lib/nexus/gemini";

export async function POST(request: Request) {
  let url: string;
  try {
    url = assertResourceUrl(await request.json());
  } catch (error) {
    const message = error instanceof ResourceUrlReject ? error.message : "invalid resource request";
    return NextResponse.json({ ok: false, executable: false, error: message }, { status: 400 });
  }

  try {
    const result = await explainResource(url);
    return NextResponse.json({ ok: true, url, ...result });
  } catch (error) {
    const unconfigured = error instanceof GeminiUnconfigured;
    return NextResponse.json(
      {
        ok: false,
        executable: false,
        error: unconfigured ? error.message : "Gemini request failed",
      },
      { status: unconfigured ? 503 : 502 },
    );
  }
}
