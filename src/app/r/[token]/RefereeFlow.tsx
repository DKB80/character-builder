"use client";

import { useMemo, useState } from "react";
import SignaturePad from "@/components/SignaturePad";
import { buildReferencePdf, downloadPdf } from "@/lib/pdf";
import { baseQuestionsFor, BASE_REFEREE_DETAIL_FIELDS } from "@/lib/questions";
import {
  PURPOSE_LABELS,
  type RefereeAnswer,
  type RefereeDetails,
  type RequestContext,
} from "@/lib/types";

type Step = "intro" | "details" | "interview" | "draft" | "sign" | "done";

const EMPTY_REFEREE: RefereeDetails = {
  fullName: "",
  email: "",
  phone: "",
  occupation: "",
  address: "",
  relationship: "",
  yearsKnown: "",
};

export default function RefereeFlow({ context }: { context: RequestContext }) {
  const [step, setStep] = useState<Step>("intro");
  const [referee, setReferee] = useState<RefereeDetails>(EMPTY_REFEREE);
  const baseQuestions = useMemo(
    () => baseQuestionsFor(context.purpose, context.subjectName),
    [context]
  );
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [editedDraft, setEditedDraft] = useState<string>("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allQuestions = useMemo(
    () => [...baseQuestions, ...aiQuestions],
    [baseQuestions, aiQuestions]
  );

  const detailsValid = BASE_REFEREE_DETAIL_FIELDS.every(
    (f) => !f.required || (referee as Record<string, string>)[f.key]?.trim()
  );

  const interviewValid = allQuestions.every((q) => answers[q]?.trim());

  const goToInterview = async () => {
    setError(null);
    setLoadingQuestions(true);
    setStep("interview");
    try {
      const res = await fetch("/api/suggest-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, referee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load questions");
      setAiQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (e) {
      // Non-fatal: fall back to base questions only
      setAiQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const generateDraft = async (revision = false) => {
    setError(null);
    setDraftLoading(true);
    try {
      const payloadAnswers: RefereeAnswer[] = allQuestions.map((q) => ({
        question: q,
        answer: answers[q] || "",
      }));
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          context,
          referee,
          answers: payloadAnswers,
          currentDraft: revision ? editedDraft : undefined,
          revisionInstruction: revision ? revisionInstruction : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft letter");
      setDraft(data.draft || "");
      setEditedDraft(data.draft || "");
      setRevisionInstruction("");
      if (!revision) setStep("draft");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to draft letter");
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSignAndDownload = async () => {
    setError(null);
    if (!typedSignature.trim()) {
      setError("Please type your full name as your signature.");
      return;
    }
    if (!drawnSignature) {
      setError("Please draw your signature in the box.");
      return;
    }
    if (!confirmAccuracy) {
      setError("Please confirm the reference is true and accurate.");
      return;
    }
    try {
      const bytes = await buildReferencePdf({
        context,
        referee,
        letterBody: editedDraft,
        typedSignature: typedSignature.trim(),
        drawnSignaturePng: drawnSignature,
        signedAt: new Date(),
      });
      const safeName = context.subjectName.replace(/[^a-z0-9]+/gi, "_");
      downloadPdf(bytes, `Character_Reference_${safeName}.pdf`);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF");
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Character reference for {context.subjectName}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Purpose: {PURPOSE_LABELS[context.purpose]}
          {context.recipient ? ` · Addressed to ${context.recipient}` : ""}
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {step === "intro" && (
        <section className="card space-y-4">
          <p className="text-sm text-stone-700">
            <strong>{context.subjectName}</strong> has asked you to write a
            character reference. This guided form will:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
            <li>Collect a few details about you.</li>
            <li>Ask you a short set of questions about {context.subjectName}.</li>
            <li>
              Generate a draft letter from your answers, which you can edit or
              ask the AI to revise.
            </li>
            <li>Let you sign and download a PDF to send to {context.subjectName}.</li>
          </ol>
          {context.context && (
            <div className="rounded-md bg-stone-100 p-3 text-sm text-stone-800">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Note from {context.subjectName}
              </div>
              {context.context}
            </div>
          )}
          <p className="text-xs text-stone-500">
            Nothing is stored on a server. The draft and signature stay in your
            browser; the only network calls are to the AI for question
            suggestions and drafting.
          </p>
          <div className="pt-2">
            <button className="btn-primary" onClick={() => setStep("details")}>
              Get started
            </button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Your details</h2>
          {BASE_REFEREE_DETAIL_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={f.key}>
                {f.label}
                {f.required && <span className="text-red-600"> *</span>}
              </label>
              <input
                id={f.key}
                className="input"
                type={"type" in f && f.type ? f.type : "text"}
                value={(referee as Record<string, string>)[f.key] || ""}
                onChange={(e) =>
                  setReferee((r) => ({ ...r, [f.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <button
              className="btn-secondary"
              onClick={() => setStep("intro")}
              type="button"
            >
              Back
            </button>
            <button
              className="btn-primary"
              disabled={!detailsValid}
              onClick={goToInterview}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "interview" && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">A few questions</h2>
          <p className="text-sm text-stone-600">
            Answer in your own words. Specific examples or short stories work
            better than general statements. There&rsquo;s no minimum length.
          </p>

          {baseQuestions.map((q) => (
            <div key={q}>
              <label className="label">{q}</label>
              <textarea
                className="textarea"
                rows={3}
                value={answers[q] || ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q]: e.target.value }))
                }
              />
            </div>
          ))}

          {loadingQuestions && (
            <p className="text-sm italic text-stone-500">
              Generating a few extra tailored questions&hellip;
            </p>
          )}

          {aiQuestions.length > 0 && (
            <>
              <div className="border-t border-stone-200 pt-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  Tailored follow-ups
                </p>
              </div>
              {aiQuestions.map((q) => (
                <div key={q}>
                  <label className="label">{q}</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={answers[q] || ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </>
          )}

          <div className="flex justify-between pt-2">
            <button
              className="btn-secondary"
              onClick={() => setStep("details")}
              type="button"
            >
              Back
            </button>
            <button
              className="btn-primary"
              disabled={!interviewValid || draftLoading || loadingQuestions}
              onClick={() => generateDraft(false)}
            >
              {draftLoading ? "Drafting…" : "Generate draft letter"}
            </button>
          </div>
        </section>
      )}

      {step === "draft" && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Review and edit the draft</h2>
          <p className="text-sm text-stone-600">
            This was drafted from your answers. Edit it directly in the box, or
            ask the AI to revise it (e.g. &ldquo;make it shorter&rdquo;,
            &ldquo;more formal&rdquo;, &ldquo;mention the school pickup
            example&rdquo;).
          </p>
          <textarea
            className="textarea font-serif"
            rows={18}
            value={editedDraft}
            onChange={(e) => setEditedDraft(e.target.value)}
          />

          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <label className="label" htmlFor="revise">
              Ask AI to revise
            </label>
            <div className="flex gap-2">
              <input
                id="revise"
                className="input"
                placeholder="e.g. Make it more formal and a bit shorter"
                value={revisionInstruction}
                onChange={(e) => setRevisionInstruction(e.target.value)}
              />
              <button
                className="btn-secondary whitespace-nowrap"
                disabled={!revisionInstruction.trim() || draftLoading}
                onClick={() => generateDraft(true)}
              >
                {draftLoading ? "Revising…" : "Revise"}
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              className="btn-secondary"
              onClick={() => setStep("interview")}
              type="button"
            >
              Back
            </button>
            <button
              className="btn-primary"
              disabled={!editedDraft.trim()}
              onClick={() => setStep("sign")}
            >
              Continue to sign
            </button>
          </div>
        </section>
      )}

      {step === "sign" && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Sign and download</h2>

          <div>
            <label className="label" htmlFor="typed">
              Type your full name as signature
            </label>
            <input
              id="typed"
              className="input"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder={referee.fullName}
            />
          </div>

          <div>
            <span className="label">Draw your signature</span>
            <SignaturePad onChange={setDrawnSignature} />
          </div>

          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmAccuracy}
              onChange={(e) => setConfirmAccuracy(e.target.checked)}
            />
            <span>
              I confirm this reference is true to the best of my knowledge, that
              I am the person named above, and I am signing it electronically.
            </span>
          </label>

          <div className="flex justify-between pt-2">
            <button
              className="btn-secondary"
              onClick={() => setStep("draft")}
              type="button"
            >
              Back
            </button>
            <button className="btn-primary" onClick={handleSignAndDownload}>
              Sign &amp; download PDF
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Done — thank you</h2>
          <p className="text-sm text-stone-700">
            Your signed PDF has been downloaded. Please email it to{" "}
            {context.requesterEmail ? (
              <a className="underline" href={`mailto:${context.requesterEmail}`}>
                {context.requesterEmail}
              </a>
            ) : (
              <>{context.subjectName}</>
            )}
            .
          </p>
          <p className="text-xs text-stone-500">
            You can close this tab. Nothing has been stored on a server.
          </p>
        </section>
      )}
    </main>
  );
}
