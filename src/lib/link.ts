import type { RequestContext } from "./types";

export function encodeContext(ctx: RequestContext): string {
  return base64UrlEncode(JSON.stringify(ctx));
}

export function decodeContext(token: string): RequestContext | null {
  try {
    const json = base64UrlDecode(token);
    const parsed = JSON.parse(json) as Partial<RequestContext>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.subject ||
      typeof parsed.subject.name !== "string" ||
      typeof parsed.purpose !== "string"
    ) {
      return null;
    }
    return {
      subject: {
        name: parsed.subject.name,
        pronouns: parsed.subject.pronouns,
      },
      purpose: parsed.purpose,
      details: typeof parsed.details === "string" ? parsed.details : "",
    };
  } catch {
    return null;
  }
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
