import type { RequestContext } from "./types";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeContext(ctx: RequestContext): string {
  const json = JSON.stringify(ctx);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeContext(token: string): RequestContext {
  const json = new TextDecoder().decode(fromBase64Url(token));
  const parsed = JSON.parse(json);
  if (!parsed || parsed.v !== 1 || !parsed.subjectName) {
    throw new Error("Invalid or unsupported reference link.");
  }
  return parsed as RequestContext;
}
