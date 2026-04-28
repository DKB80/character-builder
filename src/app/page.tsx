"use client";

import { useState } from "react";
import { encodeContext } from "@/lib/link";

export default function HomePage() {
  const [subjectName, setSubjectName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate(e: React.FormEvent) {
    e.preventDefault();
    const token = encodeContext({
      subject: {
        name: subjectName.trim(),
        pronouns: pronouns.trim() || undefined,
      },
      purpose: purpose.trim(),
      details: details.trim(),
    });
    const url = `${window.location.origin}/r/${token}`;
    setLink(url);
    setCopied(false);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const ready = subjectName.trim() && purpose.trim();

  return (
    <main>
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-semibold tracking-tight">
          Character Reference Builder
        </h1>
        <p className="mt-2 text-stone-600">
          Tell us a little about yourself and the reference you need. We'll
          give you a private link to send to someone who can vouch for you.
          They'll fill it in, sign, and you'll both get a PDF.
        </p>
      </header>

      <form onSubmit={generate} className="space-y-5">
        <Field label="Your name" htmlFor="subject-name">
          <input
            id="subject-name"
            type="text"
            required
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Alex Morgan"
          />
        </Field>

        <Field
          label="Pronouns (optional)"
          htmlFor="subject-pronouns"
          hint="Helps the referee write naturally."
        >
          <input
            id="subject-pronouns"
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            className={inputCls}
            placeholder="they/them, she/her, he/him"
          />
        </Field>

        <Field label="What is the reference for?" htmlFor="purpose">
          <input
            id="purpose"
            type="text"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={inputCls}
            placeholder="e.g. a family-court matter, a job application, a tenancy"
          />
        </Field>

        <Field
          label="Anything you'd like the referee to know"
          htmlFor="details"
          hint="Context they might not remember; what would help most. Optional."
        >
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={`${inputCls} min-h-[120px]`}
            placeholder="e.g. The court is most interested in my role as a parent…"
          />
        </Field>

        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg bg-stone-900 text-white px-4 py-2 font-medium disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          Generate link
        </button>
      </form>

      {link && (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600 mb-2">
            Send this link to your referee. It contains your details — anyone
            with the link can fill it in.
          </p>
          <div className="flex gap-2 items-stretch">
            <input
              readOnly
              value={link}
              className="flex-1 rounded border border-stone-300 px-2 py-1 text-sm font-mono bg-stone-50"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={copy}
              className="rounded bg-stone-900 text-white px-3 py-1 text-sm"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            No data is stored on our servers. The link itself encodes your
            answers above.
          </p>
        </section>
      )}
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

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
