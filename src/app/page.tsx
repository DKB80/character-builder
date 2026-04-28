"use client";

import { useMemo, useState } from "react";
import { encodeContext } from "@/lib/link";
import { PURPOSE_LABELS, type ReferencePurpose, type RequestContext } from "@/lib/types";

export default function HomePage() {
  const [subjectName, setSubjectName] = useState("");
  const [subjectPronouns, setSubjectPronouns] = useState("he/him");
  const [purpose, setPurpose] = useState<ReferencePurpose>("family_court");
  const [recipient, setRecipient] = useState("");
  const [context, setContext] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = subjectName.trim().length > 0;

  const generateLink = () => {
    const ctx: RequestContext = {
      v: 1,
      subjectName: subjectName.trim(),
      subjectPronouns: subjectPronouns.trim() || undefined,
      purpose,
      recipient: recipient.trim() || undefined,
      context: context.trim() || undefined,
      requesterEmail: requesterEmail.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const token = encodeContext(ctx);
    const url = `${window.location.origin}/r/${token}`;
    setLink(url);
    setCopied(false);
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = useMemo(() => link, [link]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Character Reference Builder
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Create a reference request to share with someone. They&rsquo;ll be
          guided through a short interview, then the app drafts the reference
          letter for them to review, sign, and download as a PDF.
        </p>
      </header>

      <section className="card space-y-5">
        <div>
          <label className="label" htmlFor="subjectName">
            Your full name (the person being referred)
          </label>
          <input
            id="subjectName"
            className="input"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Daniel Smith"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pronouns">
              Pronouns
            </label>
            <input
              id="pronouns"
              className="input"
              value={subjectPronouns}
              onChange={(e) => setSubjectPronouns(e.target.value)}
              placeholder="he/him, she/her, they/them"
            />
          </div>
          <div>
            <label className="label" htmlFor="purpose">
              Purpose
            </label>
            <select
              id="purpose"
              className="select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as ReferencePurpose)}
            >
              {Object.entries(PURPOSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="recipient">
            Addressed to (optional)
          </label>
          <input
            id="recipient"
            className="input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. The Honourable Judge / To Whom It May Concern"
          />
        </div>

        <div>
          <label className="label" htmlFor="context">
            Context for the referee (optional)
          </label>
          <textarea
            id="context"
            className="textarea"
            rows={4}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Anything you'd like the referee to know about why you're requesting this and what would help. e.g. 'This is for my custody hearing on the 12th of June. Please focus on what you've seen of me as a father.'"
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Your email (optional, shown to the referee)
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={requesterEmail}
            onChange={(e) => setRequesterEmail(e.target.value)}
            placeholder="dan@example.com"
          />
        </div>

        <div className="pt-2">
          <button
            className="btn-primary"
            onClick={generateLink}
            disabled={!canSubmit}
          >
            Generate shareable link
          </button>
        </div>
      </section>

      {previewUrl && (
        <section className="card mt-6">
          <h2 className="text-lg font-semibold">Your shareable link</h2>
          <p className="mt-1 text-sm text-stone-600">
            Send this to the person you&rsquo;d like a reference from. The link
            contains the context you entered above.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="input font-mono text-xs"
              readOnly
              value={previewUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn-secondary whitespace-nowrap" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Tip: nothing is stored on a server &mdash; the link itself contains
            the context. Anyone with this link can fill out a reference for you.
          </p>
        </section>
      )}
    </main>
  );
}
