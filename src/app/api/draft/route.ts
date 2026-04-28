import { NextResponse } from "next/server";
import { ANTHROPIC_MODEL, getAnthropic } from "@/lib/anthropic";
import {
  PURPOSE_LABELS,
  type RefereeAnswer,
  type RefereeDetails,
  type RequestContext,
} from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  context: RequestContext;
  referee: RefereeDetails;
  answers: RefereeAnswer[];
  currentDraft?: string;
  revisionInstruction?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { context, referee, answers, currentDraft, revisionInstruction } =
    body || ({} as Body);
  if (!context?.subjectName || !referee?.fullName || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
  }

  const isRevision = Boolean(currentDraft && revisionInstruction);

  const system = `You write character reference letters in the voice of the referee, based on their answers to interview questions. Rules:
- Write in first person from the referee's perspective.
- Tone: warm, sincere, specific, and grounded in the examples provided. Never sycophantic or hyperbolic.
- Do not invent facts or examples. If the answers are thin, keep the letter shorter rather than padding.
- Use the referee's own phrasing where it works; tidy grammar and flow.
- Open with "To Whom It May Concern" unless a specific recipient was provided.
- Include the referee's relationship to the subject and how long they've known them in the opening.
- Do NOT include the signature block, date, or contact details — those will be added separately.
- Do NOT include placeholders like [your name] or [date].
- Output ONLY the body of the letter as plain text. No markdown, no headings, no commentary before or after.`;

  const purposeLabel = PURPOSE_LABELS[context.purpose] || context.purpose;

  const answerBlock = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer || "(no answer)"}`)
    .join("\n\n");

  const baseInfo = `Subject of reference: ${context.subjectName}${
    context.subjectPronouns ? ` (${context.subjectPronouns})` : ""
  }
Purpose: ${purposeLabel}
Recipient: ${context.recipient || "To Whom It May Concern"}
Context from subject: ${context.context || "(none provided)"}

Referee: ${referee.fullName}
Relationship to subject: ${referee.relationship}
Years known: ${referee.yearsKnown}
Occupation: ${referee.occupation || "(not provided)"}

Referee's answers:
${answerBlock}`;

  const userMsg = isRevision
    ? `${baseInfo}

Current draft:
"""
${currentDraft}
"""

Please revise according to this instruction from the referee:
"${revisionInstruction}"

Output ONLY the revised letter body.`
    : `${baseInfo}

Write the character reference letter body now.`;

  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const draft = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
