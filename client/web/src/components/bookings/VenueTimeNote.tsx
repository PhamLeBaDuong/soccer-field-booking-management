export function VenueTimeNote({ timeZone }: { timeZone?: string }) {
  return <p className="text-xs text-stone-500">{timeZone ? `Times are shown in the venue timezone: ${timeZone.replaceAll("_", " ")}.` : "Venue location is missing. Ask the owner to set its map location."}</p>;
}
