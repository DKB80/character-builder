import { MODEL, getAnthropic } from "@/lib/anthropic";
import type { Answer, Referee, RequestContext } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You write character reference letters from the referee's first-person perspective, drawing only on the answers they provide about the subject.

Guidelines:
- Warm but specific. Use concrete details from the answers; never invent facts (no fake achievements, dates, or anecdotes).
- Match the purpose of the reference: a court or family-court letter is more formal; a job or rental letter is professional but less weighty; a personal letter can be more direct.
- Length: 250-450 words unless the user asks for shorter or longer.
- Address it appropriately. "To whom it may concern," is a sensible default if no recipient is specified.
- Open by stating who the referee is, the relationship, and how long they've known the subject.
- End with the typed name on its own line. Do not add a hand-signature placeholder; the signature is added afterwards.
- Plain prose only. No markdown, no bullet points, no headings.

When asked to revise, keep the same structure unless the instruction requires otherwise. Apply the requested change and re-output the full letter.`;

type Body = {
  context: RequestContext;
  referee: Referee;
  answers: Answer[];
  revisionInstruction?: string;
  previousDraft?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userText = buildUserText(body);

  try {
    const client = getAnthropic();
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function buildUserText(body: Body): string {
  const parts: string[] = [];
  parts.push(`Subject: ${body.context.subject.name}`);
  if (body.context.subject.pronouns) {
    parts.push(`Pronouns: ${body.context.subject.pronouns}`);
  }
  parts.push(`Purpose of the reference: ${body.context.purpose}`);
  if (body.context.details) {
    parts.push(`Subject's notes for the referee: ${body.context.details}`);
  }
  parts.push("");
  parts.push(`Referee: ${body.referee.name}`);
  parts.push(`Relationship: ${body.referee.relationship}`);
  parts.push(`Known for: ${body.referee.knownDuration}`);
  parts.push("");
  parts.push("Referee's answers:");
  for (const a of body.answers) {
    parts.push(`Q: ${a.prompt}`);
    parts.push(`A: ${a.response.trim() || "(no answer provided)"}`);
    parts.push("");
  }

  if (body.revisionInstruction && body.previousDraft) {
    parts.push("Previous draft:");
    parts.push(body.previousDraft.trim());
    parts.push("");
    parts.push(`Revision request: ${body.revisionInstruction.trim()}`);
    parts.push("Re-output the full revised letter.");
  } else {
    parts.push("Write the letter now.");
  }

  return parts.join("\n");
}
