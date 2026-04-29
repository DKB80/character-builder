import { notFound } from "next/navigation";
import { decodeContext } from "@/lib/link";
import RefereeFlow from "./RefereeFlow";

export const dynamic = "force-dynamic";

export default function RefereePage({
  params,
}: {
  params: { token: string };
}) {
  const ctx = decodeContext(params.token);
  if (!ctx) notFound();
  return <RefereeFlow context={ctx} />;
}
