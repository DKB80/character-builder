import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!cached) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    cached = new Anthropic({ apiKey });
  }
  return cached;
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
