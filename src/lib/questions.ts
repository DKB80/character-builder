import type { ReferencePurpose } from "./types";

export const BASE_REFEREE_DETAIL_FIELDS = [
  { key: "fullName", label: "Your full name", required: true },
  { key: "email", label: "Your email", required: true, type: "email" },
  { key: "phone", label: "Your phone number", required: false },
  { key: "occupation", label: "Your occupation", required: false },
  { key: "address", label: "Your address (city / suburb is fine)", required: false },
  { key: "relationship", label: "How do you know the person?", required: true },
  { key: "yearsKnown", label: "How long have you known them?", required: true },
] as const;

export function baseQuestionsFor(
  purpose: ReferencePurpose,
  subjectName: string
): string[] {
  const name = subjectName || "the person";
  const common = [
    `In what capacity and how often do you see ${name}?`,
    `What words would you use to describe ${name}'s character overall?`,
    `Can you share a specific example or story that shows ${name}'s character?`,
    `Are you aware of why this reference is being requested, and is there anything you want to address directly?`,
  ];
  switch (purpose) {
    case "family_court":
    case "custody_parenting":
      return [
        `In what capacity and how often do you see ${name} with their children?`,
        `What words would you use to describe ${name} as a parent?`,
        `Can you describe a specific moment that shows ${name}'s parenting?`,
        `What is the relationship like between ${name} and their children, from what you've seen?`,
        `How does ${name} handle stress, conflict, or difficult moments around their children?`,
        `Is there anything you'd like the court to know about ${name}'s suitability as a parent?`,
      ];
    case "court_general":
      return [
        ...common,
        `Have you observed ${name} acting with honesty and integrity? Can you give an example?`,
        `Is there anything you'd like the court to know about ${name}'s character?`,
      ];
    case "general_character":
    default:
      return common;
  }
}
