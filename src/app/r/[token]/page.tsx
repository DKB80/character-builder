import { decodeContext } from "@/lib/link";
import RefereeFlow from "./RefereeFlow";

export default function RefereePage({ params }: { params: { token: string } }) {
  let context;
  try {
    context = decodeContext(params.token);
  } catch {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold">This link isn&rsquo;t valid</h1>
          <p className="mt-2 text-sm text-stone-600">
            The reference link couldn&rsquo;t be read. Please ask the person who
            sent it to generate a new one.
          </p>
        </div>
      </main>
    );
  }

  return <RefereeFlow context={context} />;
}
