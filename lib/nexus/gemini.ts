export class ResourceUrlReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceUrlReject";
  }
}

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

export function assertResourceUrl(input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ResourceUrlReject("body must be an object with a url");
  }
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (key !== "url") throw new ResourceUrlReject(`rejected field: ${key}`);
  }
  if (typeof body.url !== "string" || !HTTP_URL.test(body.url)) {
    throw new ResourceUrlReject("url must be an http(s) resource URL");
  }
  return body.url;
}

export class GeminiUnconfigured extends Error {
  constructor() {
    super("Gemini is not configured on this instance");
    this.name = "GeminiUnconfigured";
  }
}

type GeminiResult = {
  explanation: string;
  model: string;
  executable: false;
};

async function accessToken(): Promise<string | null> {
  try {
    const response = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { access_token?: string };
    return body.access_token ?? null;
  } catch {
    return null;
  }
}

function promptFor(url: string) {
  return [
    "You are a clerk for NexusSettle.",
    "The agent may only request the resource URL below.",
    "Do not choose a payee, amount, token, chain, or transaction.",
    "In two sentences, say what the URL points at and that any payment still goes through the clearing journal.",
    `URL: ${url}`,
  ].join(" ");
}

function readText(body: unknown): string {
  const candidates = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text.slice(0, 1200);
}

export async function explainResource(url: string): Promise<GeminiResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const payload = {
    contents: [{ role: "user", parts: [{ text: promptFor(url) }] }],
    generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    return { explanation: readText(await response.json()), model, executable: false };
  }

  const token = await accessToken();
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!token || !project) throw new GeminiUnconfigured();
  const location = process.env.GEMINI_LOCATION || "us-central1";
  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error(`Vertex Gemini HTTP ${response.status}`);
  return { explanation: readText(await response.json()), model, executable: false };
}
