import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sweden & Denmark Job Market Radar" },
      { name: "description", content: "Monthly snapshot of Swedish & Danish layoffs, restructuring, in-demand roles and skills shortages." },
    ],
  }),
  component: Dashboard,
});

type Level = "low" | "moderate" | "elevated" | "high";

interface Source { title: string; url: string; date: string; source?: string }
interface EventItem {
  company?: string | null; country: string; city?: string | null; type: string;
  jobs_affected?: number | null; title: string; title_en?: string; url: string;
  date: string; sources?: Source[];
}
interface Country {
  name: string; code: string; layoff_level: Level; layoff_score: number;
  events: number; vacancies: number; vacancies_url?: string | null;
  headline?: string | null; headline_url?: string | null; summary: string;
}
interface Demand { country: string; role: string; vacancies: number; share: number }
interface Shortage { country: string; occupation: string; severity: number; source?: string }
interface Data {
  generated_at: string; period: string; summary: string; insights: string[];
  countries: Country[]; events: EventItem[]; demand: Demand[];
  shortages: Shortage[]; sources_count: number; llm?: string;
}

const FLAGS: Record<string, string> = { SE: "🇸🇪", DK: "🇩🇰", EU: "🇪🇺" };
const NAME_TO_CODE: Record<string, string> = { Sweden: "SE", Denmark: "DK", EU: "EU", EU27: "EU", Europe: "EU" };
const flagFor = (code?: string) => (code && FLAGS[code]) || "🇪🇺";
const flagByName = (name: string) => FLAGS[NAME_TO_CODE[name] ?? ""] ?? "🇪🇺";

const levelStyles: Record<Level, { bar: string; chip: string; label: string }> = {
  low:      { bar: "bg-[var(--color-level-low)]",      chip: "bg-[var(--color-level-low)]/15 text-[oklch(0.4_0.12_155)]",   label: "Low" },
  moderate: { bar: "bg-[var(--color-level-moderate)]", chip: "bg-[var(--color-level-moderate)]/25 text-[oklch(0.4_0.12_80)]", label: "Moderate" },
  elevated: { bar: "bg-[var(--color-level-elevated)]", chip: "bg-[var(--color-level-elevated)]/20 text-[oklch(0.4_0.15_50)]", label: "Elevated" },
  high:     { bar: "bg-[var(--color-level-high)]",     chip: "bg-[var(--color-level-high)]/15 text-[oklch(0.4_0.18_27)]",     label: "High" },
};

// The pipeline repo publishes the freshest snapshot; the bundled copy is a
// fallback so the site always renders even if the live fetch is unavailable.
const DATA_SOURCES = [
  "https://raw.githubusercontent.com/Defqon01/sweden-denmark-job-radar/main/docs/data.json",
  "./data.json",
];

async function loadData(): Promise<Data> {
  let lastErr: unknown;
  for (const url of DATA_SOURCES) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as Data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Failed to load data");
}

function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadData()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(String(e?.message ?? e)); });
    return () => { alive = false; };
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;
  return <DashboardView data={data} />;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span className="text-sm tracking-widest uppercase">Loading market data…</span>
      </div>
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--color-level-high)]">Data unavailable</p>
        <h1 className="mt-2 font-serif text-3xl">Couldn't load this month's snapshot</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function DashboardView({ data }: { data: Data }) {
  const countries = useMemo(() => [...data.countries].sort((a, b) => b.layoff_score - a.layoff_score), [data.countries]);
  const events = useMemo(() => [...data.events].sort((a, b) => (b.jobs_affected ?? 0) - (a.jobs_affected ?? 0)), [data.events]);
  const shortages = useMemo(
    () => data.shortages.filter((s) => s.country === "Sweden" || s.country === "Denmark").sort((a, b) => b.severity - a.severity),
    [data.shortages],
  );
  const updated = new Date(data.generated_at);
  const updatedStr = isNaN(updated.getTime()) ? data.generated_at : updated.toLocaleString(undefined, { dateStyle: "medium" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 🇸🇪 🇩🇰 Sweden &amp; Denmark · Monthly
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">Nordic Job Market Radar</h1>
            <p className="text-muted-foreground mt-1 text-sm">{data.period}</p>
          </div>
          <div className="text-xs text-muted-foreground">Updated {updatedStr}</div>
        </div>
      </header>

      {/* Condensed, actionable insights — replaces the old giant summary block. */}
      <section className="mx-auto max-w-6xl px-6 pt-8">
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">This month, at a glance</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {data.insights.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-snug text-foreground/85">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section title="Where the cuts are landing" caption="Layoff & restructuring events clustered by location.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
          <ScandinaviaMap events={events} />
          <div className="grid gap-4 sm:grid-cols-2">
            {countries.map((c) => <CountryTile key={c.code} c={c} />)}
          </div>
        </div>
      </Section>

      <BiggestMoves events={events} />

      <Section title="In-demand roles" caption="Most-advertised roles per country, by live job-board vacancy count.">
        <div className="grid gap-4 sm:grid-cols-2">
          {["Sweden", "Denmark"].map((country) => (
            <DemandCard key={country} country={country}
              rows={data.demand.filter((d) => d.country === country)} />
          ))}
        </div>
      </Section>

      <Section title="Sweden & Denmark skills shortages" caption="Source: Cedefop CLSSI 2024. Severity 1–4; highlights ≥ 3.5.">
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
              <tr>
                <th className="text-left font-medium px-5 py-3">Country</th>
                <th className="text-left font-medium px-5 py-3">Occupation</th>
                <th className="text-right font-medium px-5 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shortages.map((s, i) => {
                const hot = s.severity >= 3.5;
                return (
                  <tr key={i} className={hot ? "bg-[var(--color-level-high)]/5" : ""}>
                    <td className="px-5 py-3 whitespace-nowrap"><span className="mr-2" aria-hidden>{flagByName(s.country)}</span>{s.country}</td>
                    <td className="px-5 py-3">{s.occupation}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`tabular-nums font-semibold ${hot ? "text-[var(--color-level-high)]" : ""}`}>{s.severity.toFixed(1)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <footer className="border-t border-border mt-20">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Built from {data.sources_count} public sources covering Sweden &amp; Denmark{data.llm ? " · headlines translated by Claude" : ""}. Not financial advice.</p>
          <a href="https://github.com/Defqon01/sweden-denmark-job-radar" target="_blank" rel="noreferrer noopener" className="hover:text-accent underline-offset-4 hover:underline">View on GitHub →</a>
        </div>
      </footer>
    </div>
  );
}

/* Country tile — layoff score hero; vacancies is a clickable link to the board. */
function CountryTile({ c }: { c: Country }) {
  const s = levelStyles[c.layoff_level];
  const pct = Math.round(c.layoff_score * 100);
  return (
    <article className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent/40">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{flagFor(c.code)}</span>
          <h3 className="font-semibold">{c.name}</h3>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${s.chip}`}>{s.label}</span>
      </header>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Layoff score</span><span className="tabular-nums">{pct}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${s.bar} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">
          {c.events.toLocaleString()} workforce event{c.events === 1 ? "" : "s"} tracked
        </p>
      </div>
      {/* Vacancies number is clickable → live national job board. */}
      {c.vacancies_url ? (
        <a href={c.vacancies_url} target="_blank" rel="noreferrer noopener"
           className="mt-3 inline-flex items-baseline gap-1.5 text-sm hover:text-accent underline-offset-4 hover:underline">
          <span className="font-serif text-2xl tabular-nums text-foreground">{c.vacancies.toLocaleString()}</span>
          <span className="text-muted-foreground">open vacancies</span><span aria-hidden>→</span>
        </a>
      ) : (
        <p className="mt-3 text-sm"><span className="font-serif text-2xl tabular-nums">{c.vacancies.toLocaleString()}</span> <span className="text-muted-foreground">open vacancies</span></p>
      )}
      {c.headline && c.headline_url && (
        <a href={c.headline_url} target="_blank" rel="noreferrer noopener"
           className="mt-4 block text-sm text-foreground/90 hover:text-accent underline-offset-4 hover:underline line-clamp-2">
          {c.headline} <span aria-hidden>→</span>
        </a>
      )}
    </article>
  );
}

/* Biggest moves this month — expandable, deep-dive event cards. */
function BiggestMoves({ events }: { events: EventItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL = 9;
  const shown = showAll ? events : events.slice(0, INITIAL);
  return (
    <Section title="Biggest moves this month" caption={`${events.length} layoff, restructuring & hiring-freeze events. Click a card to expand the source coverage.`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e, i) => <EventCard key={i} e={e} />)}
      </div>
      {events.length > INITIAL && (
        <div className="mt-6 text-center">
          <button onClick={() => setShowAll((v) => !v)} className="text-sm font-semibold text-accent hover:underline underline-offset-4">
            {showAll ? "Show fewer" : `Show all ${events.length} events`} <span aria-hidden>{showAll ? "↑" : "↓"}</span>
          </button>
        </div>
      )}
    </Section>
  );
}

function EventCard({ e }: { e: EventItem }) {
  const [open, setOpen] = useState(false);
  const sources = e.sources ?? [];
  const canExpand = sources.length > 0;
  const title = e.title_en || e.title;
  return (
    <article className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent/40">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>{flagByName(e.country)}</span>
          <div className="min-w-0">
            <p className="font-semibold truncate">{e.company || e.city || "Multiple employers"}</p>
            <p className="text-xs text-muted-foreground truncate">{[e.country, e.date].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <TypeBadge type={e.type} />
      </header>
      {typeof e.jobs_affected === "number" && (
        <p className="mt-4 font-serif text-3xl tabular-nums">
          {e.jobs_affected.toLocaleString()}<span className="text-sm font-sans text-muted-foreground ml-1.5">jobs</span>
        </p>
      )}
      <p className="mt-3 text-sm text-foreground/90">{title}</p>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <a href={e.url} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline underline-offset-4">Read source →</a>
        {canExpand && (
          <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground hover:text-accent">
            {open ? "Hide" : `Deep dive (${sources.length})`} <span aria-hidden>{open ? "↑" : "↓"}</span>
          </button>
        )}
      </div>

      {open && canExpand && (
        <ol className="mt-3 border-t border-border pt-3 space-y-2">
          {sources.map((s, i) => (
            <li key={i} className="text-xs">
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-foreground/80 hover:text-accent underline-offset-4 hover:underline line-clamp-2">{s.title}</a>
              <span className="text-muted-foreground"> · {[s.source, s.date].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/* Per-country in-demand roles, from real vacancy counts. */
function DemandCard({ country, rows }: { country: string; rows: Demand[] }) {
  const max = rows.length ? Math.max(...rows.map((r) => r.vacancies)) : 1;
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <header className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/40">
        <span aria-hidden>{flagByName(country)}</span>
        <h3 className="font-semibold text-sm">{country}</h3>
      </header>
      {rows.length === 0
        ? <p className="px-5 py-6 text-sm text-muted-foreground">No vacancy data this month.</p>
        : <ol className="divide-y divide-border">
            {rows.map((r, i) => (
              <li key={r.role} className="px-5 py-3 flex items-center gap-3">
                <span className="font-serif text-base tabular-nums text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                <p className="font-medium text-sm flex-1 min-w-0 truncate">{r.role}</p>
                <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round((r.vacancies / max) * 100)}%` }} />
                </div>
                <span className="tabular-nums font-semibold text-sm w-10 text-right">{r.vacancies}</span>
              </li>
            ))}
          </ol>}
    </div>
  );
}

/* Inline SVG map of Sweden + Denmark with event clusters by city. */
const VB_W = 380, VB_H = 470;
const LON0 = 7, LON1 = 25, LAT0 = 54, LAT1 = 70;
const project = (lat: number, lon: number): [number, number] => [
  ((lon - LON0) / (LON1 - LON0)) * VB_W,
  ((LAT1 - lat) / (LAT1 - LAT0)) * VB_H,
];
const pathOf = (pts: [number, number][]) =>
  pts.map(([la, lo], i) => `${i ? "L" : "M"}${project(la, lo).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + " Z";
const SWEDEN: [number, number][] = [
  [69.0, 20.5], [68.3, 23.3], [66.0, 24.0], [63.8, 20.8], [60.9, 17.4], [59.4, 18.9],
  [58.3, 17.0], [56.3, 16.6], [55.4, 13.1], [56.4, 12.8], [57.7, 11.9], [58.9, 11.2],
  [59.9, 12.3], [61.0, 12.6], [63.0, 12.2], [65.0, 14.5], [66.5, 15.6], [68.0, 18.2],
];
const JUTLAND: [number, number][] = [
  [57.7, 10.6], [57.1, 10.9], [56.0, 10.9], [55.3, 10.0], [54.85, 9.4],
  [55.0, 8.3], [56.1, 8.1], [57.2, 8.7], [57.5, 9.6],
];
const CITY_COORDS: Record<string, [number, number]> = {
  Stockholm: [59.33, 18.07], "Göteborg": [57.71, 11.97], "Malmö": [55.60, 13.00],
  Uppsala: [59.86, 17.64], "Västerås": [59.61, 16.55], "Linköping": [58.41, 15.62],
  "Örebro": [59.27, 15.21], Helsingborg: [56.05, 12.69],
  "København": [55.68, 12.57], Aarhus: [56.16, 10.20], Odense: [55.40, 10.39],
  Aalborg: [57.05, 9.92], Esbjerg: [55.47, 8.45], Roskilde: [55.64, 12.08],
};

function ScandinaviaMap({ events }: { events: EventItem[] }) {
  const clusters = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const city = e.city && CITY_COORDS[e.city] ? e.city : null;
      if (!city) continue;
      m.set(city, (m.get(city) ?? 0) + 1);
    }
    return [...m.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  }, [events]);
  const maxCount = clusters.length ? clusters[0].count : 1;
  const radius = (n: number) => 5 + Math.sqrt(n / maxCount) * 20;
  const opacity = (n: number) => 0.35 + (n / maxCount) * 0.55;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" role="img" aria-label="Map of Sweden and Denmark with layoff event clusters">
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="var(--color-muted)" opacity="0.4" rx="10" />
        <path d={pathOf(SWEDEN)} fill="var(--color-accent-soft)" stroke="var(--color-border)" strokeWidth="1" />
        <path d={pathOf(JUTLAND)} fill="var(--color-accent-soft)" stroke="var(--color-border)" strokeWidth="1" />
        <ellipse cx={project(55.32, 10.40)[0]} cy={project(55.32, 10.40)[1]} rx="9" ry="7" fill="var(--color-accent-soft)" stroke="var(--color-border)" strokeWidth="1" />
        <ellipse cx={project(55.55, 11.85)[0]} cy={project(55.55, 11.85)[1]} rx="11" ry="9" fill="var(--color-accent-soft)" stroke="var(--color-border)" strokeWidth="1" />
        <text x={project(62.5, 15.2)[0]} y={project(62.5, 15.2)[1]} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, letterSpacing: 2 }}>SWEDEN</text>
        <text x={project(56.2, 9.3)[0]} y={project(56.2, 9.3)[1]} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, letterSpacing: 1.5 }}>DENMARK</text>
        {clusters.map((c) => {
          const [x, y] = project(...CITY_COORDS[c.city]);
          const r = radius(c.count);
          return (
            <g key={c.city}>
              <title>{`${c.city}: ${c.count} event${c.count === 1 ? "" : "s"}`}</title>
              <circle cx={x} cy={y} r={r} fill="var(--color-level-high)" opacity={opacity(c.count)} />
              <circle cx={x} cy={y} r={2} fill="var(--color-level-high)" />
              <text x={x} y={y - r - 3} textAnchor="middle" className="fill-foreground" style={{ fontSize: 9, fontWeight: 600 }}>{c.city}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        {clusters.length ? "Bubble size = events located to that city." : "No city-located events this month."}
      </p>
    </div>
  );
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 border-t border-border first-of-type:border-t-0">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl sm:text-3xl">{title}</h2>
        {caption && <p className="text-xs text-muted-foreground max-w-md">{caption}</p>}
      </header>
      {children}
    </section>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls =
    t.includes("layoff") ? "bg-[var(--color-level-high)]/12 text-[oklch(0.4_0.18_27)]" :
    t.includes("freeze") ? "bg-[var(--color-level-moderate)]/25 text-[oklch(0.4_0.12_80)]" :
    "bg-accent-soft text-accent";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold whitespace-nowrap ${cls}`}>{type}</span>;
}
