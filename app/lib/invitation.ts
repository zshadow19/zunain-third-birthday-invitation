export const invitation = {
  artworkWidth: 820,
  artworkHeight: 1919,
  // Normalized source-artwork coordinates: the entire hat and 3 must remain visible.
  revealFraction: 0.52,
  detailsFraction: 0.57,
  startsAt: "2026-11-21T18:30:00+06:00",
  timeZone: "Asia/Dhaka",
  dateLabel: "Saturday, 21 November 2026",
  timeLabel: "6:30 PM · Dhaka time",
  venue: "9th Floor, Lakeshore Heights, House 03, Road 126, Gulshan-1, Dhaka 1212, Bangladesh",
  mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=Lakeshore+Heights%2C+House+03%2C+Road+126%2C+Gulshan-1%2C+Dhaka+1212%2C+Bangladesh",
} as const;

export type InvitationState = "closed" | "opening" | "reveal" | "expanding" | "full";
export function restoredScene(historyState: unknown): "reveal" | "full" | null {
  if (!historyState || typeof historyState !== "object") return null;
  const value = (historyState as Record<string, unknown>).__zunainInvitation;
  return value === "reveal" || value === "full" ? value : null;
}
export const transitions: Record<InvitationState, readonly InvitationState[]> = {
  closed: ["opening", "full"], opening: ["reveal", "closed", "full"],
  reveal: ["expanding", "closed", "full"], expanding: ["full", "closed"], full: ["closed"],
};
export function canTransition(from: InvitationState, to: InvitationState) {
  return transitions[from].includes(to);
}
export function getCountdown(now: number) {
  const remaining = Math.max(0, Math.floor((Date.parse(invitation.startsAt) - now) / 1000));
  return {
    days: Math.floor(remaining / 86400), hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60), seconds: remaining % 60, complete: remaining === 0,
  };
}
