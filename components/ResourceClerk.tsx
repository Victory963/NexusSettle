"use client";

import { useState } from "react";

export function ResourceClerk() {
  const [url, setUrl] = useState("https://github.com/Victory963/NexusSettle");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setExplanation("");
    setError("");
    try {
      const response = await fetch("/api/agent/resource", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await response.json()) as { explanation?: string; error?: string };
      if (!response.ok) setError(body.error ?? "Gemini request failed");
      else setExplanation(body.explanation ?? "");
    } catch {
      setError("Gemini request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-12 rounded-2xl border border-white/10 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Gemini</p>
      <p className="mt-2 text-sm leading-6 text-white/60">
        代理只能提交一个资源 URL。Gemini 只解释这个地址，不选择收款人、金额或资产。
      </p>
      <label className="mt-4 block text-sm text-white/70" htmlFor="resource-url">
        资源 URL
      </label>
      <input
        id="resource-url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-white px-4 py-2 text-sm text-black disabled:opacity-50"
      >
        {pending ? "解释中" : "让 Gemini 解释"}
      </button>
      {explanation ? <p className="mt-4 text-sm leading-6 text-white/80">{explanation}</p> : null}
      {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}
    </form>
  );
}
