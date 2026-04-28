export type ReferencePurpose =
  | "family_court"
  | "custody_parenting"
  | "general_character"
  | "court_general";

export type RequestContext = {
  v: 1;
  subjectName: string;
  subjectPronouns?: string;
  purpose: ReferencePurpose;
  recipient?: string;
  context?: string;
  requesterEmail?: string;
  createdAt: string;
};

export type RefereeAnswer = {
  question: string;
  answer: string;
};

export type RefereeDetails = {
  fullName: string;
  email: string;
  phone?: string;
  occupation?: string;
  address?: string;
  relationship: string;
  yearsKnown: string;
};

export const PURPOSE_LABELS: Record<ReferencePurpose, string> = {
  family_court: "Family court",
  custody_parenting: "Custody / parenting",
  general_character: "General character",
  court_general: "Court (general)",
};
