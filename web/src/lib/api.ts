export function backendBase(): string {
  try {
    const saved = localStorage.getItem("strata-backend-url");
    if (saved && saved.length > 0) return saved.replace(/\/$/, "");
  } catch {
    void 0;
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    const v = env ? env["VITE_STRATA_API_URL"] : "";
    if (v && v.length > 0) return v.replace(/\/$/, "");
  } catch {
    void 0;
  }
  return "";
}
export function apiUrl(path: string): string {
  const b = backendBase();
  if (b.length === 0) return path.startsWith("/api") ? path : "/api" + path;
  return b + (path.startsWith("/") ? path : "/" + path);
}
export function setBackendUrl(v: string) {
  try {
    if (v.length === 0) localStorage.removeItem("strata-backend-url");
    else localStorage.setItem("strata-backend-url", v);
  } catch {
    void 0;
  }
}
export interface ApiError extends Error {
  code: string;
  status: number;
  missing?: string[];
}
export function toApiError(status: number, body: unknown, fallback: string): ApiError {
  let code = "http_error";
  let message = fallback;
  let missing: string[] | undefined = undefined;
  try {
    const o = body as Record<string, unknown>;
    if (o && typeof o["code"] === "string") code = o["code"] as string;
    if (o && typeof o["message"] === "string") message = o["message"] as string;
    if (o && typeof o["detail"] === "object" && o["detail"] !== null) {
      const d = o["detail"] as Record<string, unknown>;
      if (typeof d["code"] === "string") code = d["code"] as string;
      if (typeof d["message"] === "string") message = d["message"] as string;
      if (Array.isArray(d["missing"])) missing = d["missing"] as string[];
    }
    if (o && Array.isArray(o["missing"])) missing = o["missing"] as string[];
  } catch {
    void 0;
  }
  const e = new Error(message) as ApiError;
  e.code = code;
  e.status = status;
  if (missing) e.missing = missing;
  return e;
}
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export async function fetchJson(path: string, init: RequestInit, timeoutMs: number, retries: number, signal?: AbortSignal): Promise<unknown> {
  let last: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) throw Object.assign(new Error("cancelled"), { code: "cancelled", status: 0 });
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(apiUrl(path), { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (signal) signal.removeEventListener("abort", onAbort);
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        body = { message: text.slice(0, 400) };
      }
      if (!res.ok) throw toApiError(res.status, body, "request failed with status " + res.status);
      return body;
    } catch (e) {
      clearTimeout(t);
      if (signal) signal.removeEventListener("abort", onAbort);
      const err = e as { name?: string; code?: string };
      if (err && (err.name === "AbortError" || err.code === "cancelled")) throw e;
      last = e;
      if (attempt < retries) await sleep(300 * Math.pow(2, attempt));
    }
  }
  throw last;
}
export async function apiHealth(signal?: AbortSignal) {
  return fetchJson("/api/health", { method: "GET" }, 6000, 1, signal) as Promise<{ ok: boolean; version: string; engines: string[]; liveConfigured: boolean; missingVars: string[]; optionalVars: string[]; argoOpenAccess: boolean; mode: string }>;
}
export async function apiReconstruct(body: Record<string, unknown>, signal?: AbortSignal) {
  return fetchJson("/api/reconstruct", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, 45000, 1, signal);
}
export interface StreamEvent {
  stage: string;
  index: number;
  total: number;
  progress: number;
}
export async function apiStreamStages(params: Record<string, string>, onStage: (s: StreamEvent) => void, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const q = new URLSearchParams(params).toString();
  const url = apiUrl("/api/stream/reconstruct?" + q);
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) throw Object.assign(new Error("cancelled"), { code: "cancelled", status: 0 });
    signal.addEventListener("abort", onAbort, { once: true });
  }
  const timeout = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(url, { method: "GET", headers: { accept: "text/event-stream" }, signal: ctrl.signal });
    if (!res.ok) {
      const txt = await res.text();
      let body: unknown = null;
      try {
        body = JSON.parse(txt);
      } catch {
        body = null;
      }
      throw toApiError(res.status, body, "stream failed with status " + res.status);
    }
    if (!res.body) throw toApiError(0, null, "stream body unavailable");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let result: Record<string, unknown> | null = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const part of parts) {
        const lines = part.split("\n");
        let ev = "";
        let data = "";
        for (const ln of lines) {
          if (ln.startsWith("event:")) ev = ln.slice(6).trim();
          if (ln.startsWith("data:")) data += ln.slice(5).trim();
        }
        if (ev === "stage" && data.length > 0) {
          try {
            const o = JSON.parse(data) as StreamEvent;
            onStage(o);
          } catch {
            void 0;
          }
        }
        if (ev === "done" && data.length > 0) {
          try {
            result = JSON.parse(data) as Record<string, unknown>;
          } catch {
            void 0;
          }
        }
      }
      if (result) {
        try {
          await reader.cancel();
        } catch {
          void 0;
        }
        break;
      }
    }
    if (!result) throw toApiError(0, null, "stream ended without result");
    return result;
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
