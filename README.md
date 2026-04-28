# Character Reference Builder

A small Next.js webapp for collecting character references. You create a
shareable link, send it to someone you'd like a reference from, and they:

1. Fill in their details (name, email, relationship, how long they've known you).
2. Answer a short set of questions tailored to the purpose of the reference.
   Claude generates a few follow-up questions based on their relationship to
   you.
3. Get an AI-drafted letter from their answers, which they can edit directly or
   ask Claude to revise (e.g. "make it shorter", "more formal").
4. Sign — typed name + drawn signature on a pad — and download a PDF.

There is no database. The shareable link encodes the request context. The PDF
is built in the browser; nothing is stored server-side.

## Local development

Requires Node 18+.

```bash
cp .env.example .env.local        # then add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Name | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server-side only). Required. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-sonnet-4-6`. |

## Deployment

### Netlify

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify will auto-detect Next.js (it uses `@netlify/plugin-nextjs`). Leave
   build command (`next build`) and publish directory as defaults.
4. Add `ANTHROPIC_API_KEY` under **Site settings → Environment variables**.
5. Deploy.

### Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Defaults are correct.
3. Add `ANTHROPIC_API_KEY` under **Project → Settings → Environment Variables**.
4. Deploy.

Either platform will give you a public URL. Use that as the base for your
shareable links.

## How it works (file map)

- `src/app/page.tsx` — your flow: fill in subject, purpose, context → produces
  a `/r/<token>` link.
- `src/lib/link.ts` — base64url encodes/decodes the request context into the
  link.
- `src/app/r/[token]/page.tsx` — server component that decodes the link and
  hands off to the client flow.
- `src/app/r/[token]/RefereeFlow.tsx` — the multi-step referee experience.
- `src/app/api/suggest-questions/route.ts` — calls Claude to suggest tailored
  follow-up questions.
- `src/app/api/draft/route.ts` — calls Claude to draft (and later revise) the
  letter from the answers.
- `src/components/SignaturePad.tsx` — drawn-signature pad.
- `src/lib/pdf.ts` — builds the signed PDF in the browser using `pdf-lib`.

## Notes on legal weight

A typed name + drawn signature + timestamp is acceptable for informal
references and for use in many family-court matters, but it is not a
"qualified" e-signature with a third-party audit trail. If a specific court or
process requires more (e.g. a justice of the peace, a statutory declaration,
DocuSign with audit certificate), this app won't replace that. The PDF
includes an electronic-signature notice with the signer's name, timestamp, and
the relationship details they provided.
