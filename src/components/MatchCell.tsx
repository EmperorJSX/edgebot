import { flagUrl, teamIso2 } from "@/lib/flagUrl";

/** "Brazil vs Germany" -> flag + flag + label. Unknown team names (club sides,
 * arbitrary live fixtures) fall back to a monogram dot so nothing breaks. */
export default function MatchCell({ match }: { match: string }) {
  const parts = match.split(/\s+(?:vs|v|-)\s+/i).slice(0, 2);
  return (
    <span className="flex items-center gap-2">
      {parts.map((p, i) => (
        <TeamMark key={i} name={p} />
      ))}
      <span className="ml-1.5 font-medium">{match}</span>
    </span>
  );
}

function TeamMark({ name }: { name: string }) {
  const iso2 = teamIso2(name);
  if (iso2) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flagUrl(iso2)}
        alt=""
        aria-hidden
        loading="lazy"
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-panel text-[10px] font-bold text-muted">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
