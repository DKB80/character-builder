import { NextResponse } from "next/server";
import { ANTHROPIC_MODEL, getAnthropic } from "@/lib/anthropic";
import { PURPOSE_LABELS, type RequestContext, type RefereeDetails } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  context: RequestContext;
  referee: RefereeDetails;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { context, referee } = body || ({} as Body);
  if (!context?.subjectName || !referee?.fullName) {
    return NextResponse.json(
      { error: "Missing context or referee details." },
      { status: 400 }
    );
  }

  const system = `You write thoughtful interview questions used to gather material for a personal character reference letter. Output ONLY a JSON array of 3 to 5 short, plain-English questions (strings). No prose, no numbering, no markdown. Each question should:
- Be open-ended and invite a specific story or example
- Be tailored to what the referee already told us about their relationship to the subject
- Avoid yes/no phrasing
- Be respectful and easy to answer
- Not duplicate the standard questions the referee will already have answered`;

  const purposeLabel = PURPOSE_LABELS[context.purpose] || context.purpose;

  const userMsg = `Subject of the reference: ${context.subjectName}${
    context.subjectPronouns ? ` (${context.subjectPronouns})` : ""
  }
Purpose of reference: ${purposeLabel}
Recipient: ${context.recipient || "(not specified)"}
Context from the subject: ${context.context || "(none provided)"}

Referee's name: ${referee.fullName}
Referee's relationship to the subject: ${referee.relationship}
Years known: ${referee.yearsKnown}
Referee's occupation: ${referee.occupation || "(not provided)"}

The referee has already given the standard questions. Now generate 3-5 follow-up questions that will help them speak to specific, vivid examples relevant to this purpose and to their relationship with the subject. Output the JSON array only.`;

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ questions: [] });
    }
    const arr = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const questions = (Array.isArray(arr) ? arr : [])
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 5);
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
