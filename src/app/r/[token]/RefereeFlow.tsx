"use client";

import { useMemo, useState } from "react";
import SignaturePad from "@/components/SignaturePad";
import { buildPdf } from "@/lib/pdf";
import { baseQuestions } from "@/lib/questions";
import type {
  Answer,
  Question,
  Referee,
  RequestContext,
} from "@/lib/types";

type Step = "identify" | "questions" | "draft" | "sign" | "done";

export default function RefereeFlow({ context }: { context: RequestContext }) {
  const [step, setStep] = useState<Step>("identify");
  const [referee, setReferee] = useState<Referee>({
    name: "",
    email: "",
    mobile: "",
    relationship: "",
    knownDuration: "",
  });
  const base = useMemo(() => baseQuestions(context), [context]);
  const [suggested, setSuggested] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [revisionInstruction, setRevisionInstruction] = useState("");

  const [typedName, setTypedName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const allQuestions = [...base, ...suggested];

  async function submitIdentify(e: React.FormEvent) {
    e.preventDefault();
    setLoadingQuestions(true);
    setQuestionsError(null);
    try {
      const res = await fetch("/api/suggest-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          referee,
          baseQuestions: base.map((q) => q.prompt),
        }),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = (await res.json()) as { questions?: string[] };
      const generated: Question[] = (data.questions || []).map((prompt, i) => ({
        id: `s${i}`,
        prompt,
      }));
      setSuggested(generated);
      setStep("questions");
    } catch (err) {
      setQuestionsError(
        err instanceof Error ? err.message : "Could not load follow-up questions."
      );
      setSuggested([]);
      setStep("questions");
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function generateDraft(opts?: { revision?: string }) {
    setDrafting(true);
    setDraftError(null);
    const previousDraft = opts?.revision ? draft : undefined;
    if (!opts?.revision) setDraft("");
    try {
      const answers: Answer[] = allQuestions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        response: responses[q.id] || "",
      }));
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          referee,
          answers,
          revisionInstruction: opts?.revision,
          previousDraft,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Server returned ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (opts?.revision) acc = "";
      setDraft("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc);
      }
      acc += decoder.decode();
      setDraft(acc.trim());
      if (step !== "draft") setStep("draft");
      setRevisionInstruction("");
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Could not draft the letter."
      );
    } finally {
      setDrafting(false);
    }
  }

  async function downloadPdf() {
    if (!signatureDataUrl || !typedName.trim() || !draft.trim()) return;
    setDownloading(true);
    try {
      const bytes = await buildPdf({
        context,
        referee,
        letter: draft,
        typedName: typedName.trim(),
        signatureDataUrl,
        signedAt: new Date(),
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const filename = `reference-${slug(context.subject.name)}-${slug(typedName)}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStep("done");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main>
      <Header context={context} />

      {step === "identify" && (
        <IdentifyStep
          referee={referee}
          onChange={setReferee}
          onSubmit={submitIdentify}
          loading={loadingQuestions}
          error={questionsError}
        />
      )}

      {step === "questions" && (
        <QuestionsStep
          questions={allQuestions}
          responses={responses}
          onChangeResponse={(id, v) =>
            setResponses((r) => ({ ...r, [id]: v }))
          }
          onBack={() => setStep("identify")}
          onSubmit={() => generateDraft()}
          drafting={drafting}
          error={questionsError}
        />
      )}

      {step === "draft" && (
        <DraftStep
          draft={draft}
          onChange={setDraft}
          drafting={drafting}
          error={draftError}
          revisionInstruction={revisionInstruction}
          onChangeInstruction={setRevisionInstruction}
          onRevise={() =>
            revisionInstruction.trim() &&
            generateDraft({ revision: revisionInstruction.trim() })
          }
          onContinue={() => setStep("sign")}
          onBack={() => setStep("questions")}
        />
      )}

      {step === "sign" && (
        <SignStep
          referee={referee}
          typedName={typedName}
          onChangeTypedName={setTypedName}
          onSignatureChange={setSignatureDataUrl}
          signatureReady={!!signatureDataUrl}
          downloading={downloading}
          onBack={() => setStep("draft")}
          onDownload={downloadPdf}
        />
      )}

      {step === "done" && <DoneStep />}
    </main>
  );
}

function Header({ context }: { context: RequestContext }) {
  return (
    <header className="mb-8">
      <p className="text-sm uppercase tracking-wide text-stone-500">
        Character reference
      </p>
      <h1 className="mt-1 text-3xl font-serif font-semibold tracking-tight">
        For {context.subject.name}
      </h1>
      <p className="mt-2 text-stone-600">
        {context.subject.name} has asked you to provide a character reference
        {context.purpose ? (
          <>
            {" "}
            for <span className="italic">{context.purpose}</span>
          </>
        ) : null}
        . This will take about ten minutes.
      </p>
      {context.details && (
        <blockquote className="mt-4 rounded-md border-l-2 border-stone-300 bg-stone-100 p-3 text-sm text-stone-700">
          <p className="font-medium text-stone-800 mb-1">
            A note from {context.subject.name}:
          </p>
          <p className="whitespace-pre-wrap">{context.details}</p>
        </blockquote>
      )}
    </header>
  );
}

function IdentifyStep({
  referee,
  onChange,
  onSubmit,
  loading,
  error,
}: {
  referee: Referee;
  onChange: (r: Referee) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  const ready =
    referee.name.trim() &&
    referee.email.trim() &&
    referee.relationship.trim() &&
    referee.knownDuration.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-xl font-serif font-semibold">A bit about you</h2>
      <Field label="Your name" htmlFor="ref-name">
        <input
          id="ref-name"
          type="text"
          required
          className={inputCls}
          value={referee.name}
          onChange={(e) => onChange({ ...referee, name: e.target.value })}
        />
      </Field>
      <Field label="Email" htmlFor="ref-email">
        <input
          id="ref-email"
          type="email"
          required
          className={inputCls}
          value={referee.email}
          onChange={(e) => onChange({ ...referee, email: e.target.value })}
        />
      </Field>
      <Field
        label="Mobile (optional)"
        htmlFor="ref-mobile"
        hint="Included on the PDF if you'd like to be reachable by phone."
      >
        <input
          id="ref-mobile"
          type="tel"
          className={inputCls}
          value={referee.mobile || ""}
          onChange={(e) => onChange({ ...referee, mobile: e.target.value })}
        />
      </Field>
      <Field
        label="Your relationship"
        htmlFor="ref-rel"
        hint="e.g. friend, neighbour, line manager, GP, family member."
      >
        <input
          id="ref-rel"
          type="text"
          required
          className={inputCls}
          value={referee.relationship}
          onChange={(e) =>
            onChange({ ...referee, relationship: e.target.value })
          }
        />
      </Field>
      <Field label="How long have you known each other?" htmlFor="ref-known">
        <input
          id="ref-known"
          type="text"
          required
          className={inputCls}
          placeholder="e.g. about 5 years"
          value={referee.knownDuration}
          onChange={(e) =>
            onChange({ ...referee, knownDuration: e.target.value })
          }
        />
      </Field>

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          {error} You can still continue with the standard questions.
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || loading}
        className="rounded-lg bg-stone-900 text-white px-4 py-2 font-medium disabled:bg-stone-300 disabled:cursor-not-allowed"
      >
        {loading ? "Loading questions…" : "Continue"}
      </button>
    </form>
  );
}

function QuestionsStep({
  questions,
  responses,
  onChangeResponse,
  onBack,
  onSubmit,
  drafting,
  error,
}: {
  questions: Question[];
  responses: Record<string, string>;
  onChangeResponse: (id: string, v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  drafting: boolean;
  error: string | null;
}) {
  const answered = questions.filter((q) =>
    (responses[q.id] || "").trim()
  ).length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold">A few questions</h2>
        <p className="text-sm text-stone-600 mt-1">
          Two or three sentences each is plenty. We'll turn your answers into a
          first draft you can edit before signing.
        </p>
      </div>

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          We couldn't generate tailored follow-ups, so we're using the standard
          set.
        </p>
      )}

      {questions.map((q, i) => (
        <div key={q.id}>
          <label
            htmlFor={`q-${q.id}`}
            className="block text-sm font-medium mb-1"
          >
            {i + 1}. {q.prompt}
          </label>
          <textarea
            id={`q-${q.id}`}
            className={`${inputCls} min-h-[100px]`}
            value={responses[q.id] || ""}
            onChange={(e) => onChangeResponse(q.id, e.target.value)}
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-600 underline"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">
            {answered}/{questions.length} answered
          </span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={answered === 0 || drafting}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 font-medium disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {drafting ? "Drafting…" : "Generate draft"}
          </button>
        </div>
      </div>
    </section>
  );
}

function DraftStep({
  draft,
  onChange,
  drafting,
  error,
  revisionInstruction,
  onChangeInstruction,
  onRevise,
  onContinue,
  onBack,
}: {
  draft: string;
  onChange: (v: string) => void;
  drafting: boolean;
  error: string | null;
  revisionInstruction: string;
  onChangeInstruction: (v: string) => void;
  onRevise: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-serif font-semibold">Your draft letter</h2>
        <p className="text-sm text-stone-600 mt-1">
          Edit anything you'd like to change. You can also ask Claude to revise.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      <textarea
        className={`${inputCls} min-h-[400px] font-serif leading-relaxed`}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        readOnly={drafting}
      />

      <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
        <label
          htmlFor="revision"
          className="block text-sm font-medium text-stone-700"
        >
          Ask Claude to revise
        </label>
        <div className="flex gap-2">
          <input
            id="revision"
            type="text"
            placeholder="e.g. make it shorter, more formal, less effusive"
            className={`${inputCls} flex-1`}
            value={revisionInstruction}
            onChange={(e) => onChangeInstruction(e.target.value)}
            disabled={drafting}
          />
          <button
            type="button"
            onClick={onRevise}
            disabled={drafting || !revisionInstruction.trim()}
            className="rounded-lg bg-stone-700 text-white px-3 py-2 text-sm font-medium disabled:bg-stone-300"
          >
            {drafting ? "Revising…" : "Revise"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-600 underline"
        >
          Back to answers
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={drafting || !draft.trim()}
          className="rounded-lg bg-stone-900 text-white px-4 py-2 font-medium disabled:bg-stone-300"
        >
          Looks good — sign
        </button>
      </div>
    </section>
  );
}

function SignStep({
  referee,
  typedName,
  onChangeTypedName,
  onSignatureChange,
  signatureReady,
  downloading,
  onBack,
  onDownload,
}: {
  referee: Referee;
  typedName: string;
  onChangeTypedName: (v: string) => void;
  onSignatureChange: (v: string | null) => void;
  signatureReady: boolean;
  downloading: boolean;
  onBack: () => void;
  onDownload: () => void;
}) {
  const ready = typedName.trim() && signatureReady;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-serif font-semibold">Sign and download</h2>
        <p className="text-sm text-stone-600 mt-1">
          Type your name as you'd like it to appear, then draw your signature.
          A timestamped PDF will download to this device.
        </p>
      </div>

      <Field label="Your name as it should appear" htmlFor="typed-name">
        <input
          id="typed-name"
          type="text"
          className={inputCls}
          value={typedName}
          onChange={(e) => onChangeTypedName(e.target.value)}
          placeholder={referee.name}
        />
      </Field>

      <div>
        <p className="block text-sm font-medium mb-1">Signature</p>
        <SignaturePad onChange={onSignatureChange} />
      </div>

      <p className="text-xs text-stone-500">
        Signing applies a typed name, drawn signature, and timestamp to the PDF
        you'll download. This is acceptable for most informal references but is
        not a "qualified" e-signature with a third-party audit trail.
      </p>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-600 underline"
        >
          Back to letter
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!ready || downloading}
          className="rounded-lg bg-stone-900 text-white px-4 py-2 font-medium disabled:bg-stone-300"
        >
          {downloading ? "Building PDF…" : "Sign and download PDF"}
        </button>
      </div>
    </section>
  );
}

function DoneStep() {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="text-xl font-serif font-semibold text-emerald-900">
        Your reference is downloaded.
      </h2>
      <p className="mt-2 text-emerald-900/80 text-sm">
        Send the PDF to whoever asked for it (and, if you'd like, keep a copy
        for yourself). Thank you for taking the time.
      </p>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ref"
  );
}
