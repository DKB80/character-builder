export type RequestContext = {
  subject: {
    name: string;
    pronouns?: string;
  };
  purpose: string;
  details: string;
};

export type Referee = {
  name: string;
  email: string;
  mobile?: string;
  relationship: string;
  knownDuration: string;
};

export type Question = {
  id: string;
  prompt: string;
};

export type Answer = {
  questionId: string;
  prompt: string;
  response: string;
};
