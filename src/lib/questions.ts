import type { Question, RequestContext } from "./types";

export function baseQuestions(ctx: RequestContext): Question[] {
  const name = ctx.subject.name || "them";
  return [
    {
      id: "context",
      prompt: `In what context have you known ${name}, and how often do you interact?`,
    },
    {
      id: "qualities",
      prompt: `What three qualities or strengths of ${name} stand out most to you?`,
    },
    {
      id: "example",
      prompt: `Can you describe a specific moment or example that illustrates ${name}'s character?`,
    },
  ];
}
