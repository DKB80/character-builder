import type { RequestContext } from "./types";

export function encodeContext(ctx: RequestContext): string {
  const compact: Record<string, string> = {
    n: ctx.subject.name,
    u: ctx.purpose,
  };
  if (ctx.subject.pronouns) compact.p = ctx.subject.pronouns;
  if (ctx.details) compact.d = ctx.details;
  return base64UrlEncode(JSON.stringify(compact));
}

export function decodeContext(token: string): RequestContext | null {
  try {
    const json = base64UrlDecode(token);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;

    if (typeof parsed.n === "string" && typeof parsed.u === "string") {
      return {
        subject: {
          name: parsed.n,
          pronouns: typeof parsed.p === "string" ? parsed.p : undefined,
        },
        purpose: parsed.u,
        details: typeof parsed.d === "string" ? parsed.d : "",
      };
    }

    const legacy = parsed as {
      subject?: { name?: unknown; pronouns?: unknown };
      purpose?: unknown;
      details?: unknown;
    };
    if (
      legacy.subject &&
      typeof legacy.subject.name === "string" &&
      typeof legacy.purpose === "string"
    ) {
      return {
        subject: {
          name: legacy.subject.name,
          pronouns:
            typeof legacy.subject.pronouns === "string"
              ? legacy.subject.pronouns
              : undefined,
        },
        purpose: legacy.purpose,
        details: typeof legacy.details === "string" ? legacy.details : "",
      };
    }

    return null;
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
