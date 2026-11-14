import { SpotArt, type SpotName } from "@/components/brand/SpotArt";

/** The one empty-state picture: the brand spot illustrations, decorative (the text beside it says it). */
export type EmptyArtKind = "field" | "options" | "evidence" | "clear" | "sent";

const SPOT: Record<EmptyArtKind, SpotName> = { field: "no-field", options: "loading-data", evidence: "loading-data", clear: "no-alerts", sent: "email-sent" };

export function EmptyArt({ kind = "field", size = 168 }: { kind?: EmptyArtKind; size?: number }) {
  return <SpotArt name={SPOT[kind]} width={size} className="shrink-0" />;
}
