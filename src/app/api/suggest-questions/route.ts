import { NextResponse } from "next/server";
import { MODEL, getAnthropic } from "@/lib/anthropic";
import type { Referee, RequestContext } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You generate short, thoughtful follow-up questions for someone who has been asked to give a character reference.

Guidelines:
- Tailor each question to the specific relationship and the purpose of the reference.
- Open-ended, but answerable in 2-3 sentences.
- Concrete: prompt for examples or specifics, not abstract praise.
- Avoid duplicating the base questions you'll be told about.
- Avoid anything embarrassing, intrusive, or about protected characteristics.

Return ONLY a JSON object of the form: {"questions": ["...", "...", "..."]}.
Generate exactly 3 questions. Do not number them. Each ends with a question mark.`;

type Body = {
  context: RequestContext;
  referee: Referee;
  baseQuestions: string[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.context?.subject?.name || !body?.referee?.relationship) {
    return NextResponse.json(
      { error: "Missing context or referee details" },
      { status: 400 }
    );
  }

  const userText = [
    `Subject of the reference: ${body.context.subject.name}`,
    body.context.subject.pronouns
      ? `Pronouns: ${body.context.subject.pronouns}`
      : null,
    `Purpose of the reference: ${body.context.purpose || "(not specified)"}`,
    `Subject's notes for the referee: ${body.context.details || "(none)"}`,
    "",
    `Referee's relationship: ${body.referee.relationship}`,
    `How long they've known each other: ${body.referee.knownDuration || "(not specified)"}`,
    "",
    "Base questions already being asked (do not repeat these):",
    ...body.baseQuestions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "Generate 3 tailored follow-up questions.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    });

    const text = resp.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("");
    const questions = parseQuestions(text);
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseQuestions(text: string): string[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const obj = JSON.parse(match[0]) as { questions?: unknown };
    if (!Array.isArray(obj.questions)) return [];
    return obj.questions
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
  }
}
