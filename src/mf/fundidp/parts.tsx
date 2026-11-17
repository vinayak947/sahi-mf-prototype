import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../../assets";
import { Icon, type IconName } from "./Icon";
import { riskLevels, type CategoryKey, type Fund, type Risk } from "../data";
// Artwork box used by ArtBox (their store.tsx defines it; ours does not).
export type Art = { src: string; x: number; y: number; w: number; h: number; fit?: [number, number, number, number] };
import { pct, rupeesInWords } from "./format";

export const DISCLAIMER =
  "Mutual fund investments are subject to market risks, read all scheme related documents carefully.";

// AMC logos (official marks, square). Files sit in public/assets as amc-*.png.
const AMC_LOGO: Record<string, string> = {
  "Aditya Birla": "amc-aditya-birla.png",
  Bandhan: "amc-bandhan.png",
  Edelweiss: "amc-edelweiss.png",
  Franklin: "amc-franklin.png",
  HDFC: "amc-hdfc.png",
  "ICICI Prudential": "amc-icici.png",
  Groww: "amc-groww.png",
  "JM Financial": "amc-jm.png",
  Kotak: "amc-kotak.png",
  "Mirae Asset": "amc-mirae.png",
  "Motilal Oswal": "amc-motilal.png",
  "Nippon India": "amc-nippon.png",
  PPFAS: "amc-ppfas.png",
  Quant: "amc-quant.png",
  SBI: "amc-sbi.png",
  Tata: "amc-tata.png",
  UTI: "amc-uti.png",
};

// The AMC's logo on a soft tile; the two-letter mark stays as the fallback.
export function FundMark({ fund, size = 40 }: { fund: Fund; size?: number }) {
  const logo = AMC_LOGO[fund.amc];
  return (
    <span className="fund-mark" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {logo ? <img src={asset(logo)} alt={fund.amc} draggable={false} /> : fund.mono}
    </span>
  );
}

// Sort + category chips, the same row on home and on every fund list.
export type FundSort = "returns" | "rating" | "cost";
const SORT_LABELS: Record<FundSort, string> = {
  returns: "3Y returns, high to low",
  rating: "Rating, high to low",
  cost: "Expense ratio, low to high",
};
const ROW_CHIPS: { key: CategoryKey; label: string }[] = [
  { key: "index", label: "Index only" },
  { key: "flexi", label: "Flexi Cap" },
  { key: "large", label: "Large Cap" },
  { key: "small", label: "Small Cap" },
  { key: "debt", label: "Debt" },
  { key: "liquid", label: "Liquid" },
];

// "Returns" always ranks on 3Y. The 1Y/3Y/5Y switch changes the number shown, never the order, so a person can read one fund across periods.
export function sortFunds(list: Fund[], sort: FundSort, _basis?: ReturnBasis): Fund[] {
  return [...list].sort((a, b) =>
    sort === "returns" ? b.r3 - a.r3 : sort === "rating" ? b.stars - a.stars || b.r3 - a.r3 : a.expense - b.expense,
  );
}

// Advanced filters (the "Filters" sheet): AMC, rating and risk. Category is the chip row's own filter, shared with the sheet.
export type FundFilters = { amcs: string[]; stars: number; risks: Risk[] };
export const noFilters: FundFilters = { amcs: [], stars: 0, risks: [] };
export const filterCount = (f: FundFilters) => f.amcs.length + f.risks.length + (f.stars ? 1 : 0);
export function applyFilters(list: Fund[], f: FundFilters): Fund[] {
  return list.filter(
    (fund) =>
      (f.amcs.length === 0 || f.amcs.includes(fund.amc)) &&
      (f.stars === 0 || fund.stars >= f.stars) &&
      (f.risks.length === 0 || f.risks.includes(fund.risk)),
  );
}
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

// Filter sheet (Figma Base Design System 4705:76693): a bottom sheet whose header switches between "Filter" and "Sort by"; Filter is a
// left rail of groups (Category, AMC, Rating, Risk) beside a grey panel of choices; the bar below holds Clear all and Apply.
// Nothing changes behind the sheet until Apply.
type Group = "cat" | "amc" | "rating" | "risk";

function Mark({ kind, on }: { kind: "radio" | "check"; on: boolean }) {
  return (
    <span className={`mf-fmark ${kind}${on ? " on" : ""}`} aria-hidden="true">
      {kind === "check" && on && <Icon name="check" size={12} />}
    </span>
  );
}

export function FiltersSheet({
  cat,
  filters,
  sort,
  cats,
  amcs,
  risks,
  count,
  showSort,
  onApply,
  onClose,
}: {
  cat: CategoryKey | "all";
  filters: FundFilters;
  sort: FundSort;
  cats: { key: CategoryKey; label: string }[]; // empty: the list is already one category, so no Category group
  amcs: string[];
  risks: Risk[];
  count: (cat: CategoryKey | "all", f: FundFilters) => number;
  showSort: boolean; // false on a list with one fixed ranking
  onApply: (cat: CategoryKey | "all", f: FundFilters, sort: FundSort) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"filter" | "sort">("filter");
  const groups: Group[] = [...(cats.length > 1 ? (["cat"] as Group[]) : []), "amc", "rating", "risk"];
  const [group, setGroup] = useState<Group>(groups[0]);
  const [draftCat, setDraftCat] = useState(cat);
  const [draft, setDraft] = useState(filters);
  const [draftSort, setDraftSort] = useState(sort);
  const [closing, setClosing] = useState(false);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const n = count(draftCat, draft);
  const dirty = draftCat !== "all" || filterCount(draft) > 0 || draftSort !== "returns";
  const GROUP_LABEL: Record<Group, string> = { cat: "Category", amc: "AMC", rating: "Rating", risk: "Risk" };
  const picked: Record<Group, number> = {
    cat: draftCat === "all" ? 0 : 1,
    amc: draft.amcs.length,
    rating: draft.stars ? 1 : 0,
    risk: draft.risks.length,
  };
  const Opt = ({ kind, on, onClick, children }: { kind: "radio" | "check"; on: boolean; onClick: () => void; children: ReactNode }) => (
    <button className={`mf-fopt${on ? " on" : ""}`} role={kind === "radio" ? "radio" : "checkbox"} aria-checked={on} onClick={onClick}>
      {children}
      <Mark kind={kind} on={on} />
    </button>
  );
  return (
    <div className={`mf-sheet-layer${closing ? " closing" : ""}`}>
      <button className="mf-sheet-scrim" aria-label="Close" onClick={() => setClosing(true)} />
      <div
        className="mf-sheet mf-fsheet"
        role="dialog"
        aria-modal="true"
        aria-label={showSort ? "Filter and sort" : "Filter"}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) {
            if (applied) onApply(draftCat, draft, draftSort);
            onClose();
          }
        }}
      >
        <header className="mf-fsheet-head">
          {showSort ? (
            <div className="mf-fseg" role="tablist">
              <button role="tab" aria-selected={tab === "filter"} className={tab === "filter" ? "on" : ""} onClick={() => setTab("filter")}>
                Filter
              </button>
              <button role="tab" aria-selected={tab === "sort"} className={tab === "sort" ? "on" : ""} onClick={() => setTab("sort")}>
                Sort by
              </button>
            </div>
          ) : (
            <h2>Filter</h2>
          )}
          <button className="mf-fsheet-x" aria-label="Close" onClick={() => setClosing(true)}>
            <Icon name="x" size={24} />
          </button>
        </header>
        <div className="mf-fsheet-body">
          {tab === "sort" ? (
            <div className="mf-fpanel wide" role="radiogroup" aria-label="Sort by">
              {(Object.keys(SORT_LABELS) as FundSort[]).map((key) => (
                <Opt key={key} kind="radio" on={draftSort === key} onClick={() => setDraftSort(key)}>
                  {SORT_LABELS[key]}
                </Opt>
              ))}
            </div>
          ) : (
            <>
              <nav className="mf-frail" aria-label="Filter by">
                {groups.map((g) => (
                  <button key={g} className={group === g ? "on" : ""} aria-current={group === g} onClick={() => setGroup(g)}>
                    <span>{GROUP_LABEL[g]}</span>
                    {picked[g] > 0 && <i>{picked[g]}</i>}
                  </button>
                ))}
              </nav>
              <div className="mf-fpanel" role={group === "amc" || group === "risk" ? "group" : "radiogroup"} aria-label={GROUP_LABEL[group]} key={group}>
                {group === "cat" && (
                  <>
                    <Opt kind="radio" on={draftCat === "all"} onClick={() => setDraftCat("all")}>
                      All categories
                    </Opt>
                    {cats.map((c) => (
                      <Opt key={c.key} kind="radio" on={draftCat === c.key} onClick={() => setDraftCat(c.key)}>
                        {c.label}
                      </Opt>
                    ))}
                  </>
                )}
                {group === "amc" &&
                  amcs.map((a) => (
                    <Opt key={a} kind="check" on={draft.amcs.includes(a)} onClick={() => setDraft({ ...draft, amcs: toggle(draft.amcs, a) })}>
                      {a}
                    </Opt>
                  ))}
                {group === "rating" && (
                  <>
                    <Opt kind="radio" on={draft.stars === 0} onClick={() => setDraft({ ...draft, stars: 0 })}>
                      Any rating
                    </Opt>
                    {[3, 4, 5].map((r) => (
                      <Opt key={r} kind="radio" on={draft.stars === r} onClick={() => setDraft({ ...draft, stars: r })}>
                        {r}★{r < 5 ? " & above" : ""}
                      </Opt>
                    ))}
                  </>
                )}
                {group === "risk" &&
                  risks.map((r) => (
                    <Opt key={r} kind="check" on={draft.risks.includes(r)} onClick={() => setDraft({ ...draft, risks: toggle(draft.risks, r) })}>
                      {r}
                    </Opt>
                  ))}
              </div>
            </>
          )}
        </div>
        <footer className="mf-fsheet-foot">
          <button
            className="mf-btn"
            disabled={!dirty}
            onClick={() => {
              setDraftCat("all");
              setDraft(noFilters);
              setDraftSort("returns");
            }}
          >
            Clear all
          </button>
          <button
            className="mf-btn solid"
            disabled={n === 0}
            onClick={() => {
              setApplied(true);
              setClosing(true);
            }}
          >
            {n === 0 ? "No funds match" : "Apply"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function FilterRow<K extends string = CategoryKey>({
  cat,
  onCat,
  sort,
  onSort,
  chips,
  noSort,
  onFilters,
  filterBadge = 0,
}: {
  cat: K | "all";
  onCat: (cat: K | "all") => void;
  sort: FundSort;
  onSort: (sort: FundSort) => void;
  noSort?: boolean; // a list with one fixed ranking (Top performing) has no Sort by chip
  onFilters?: () => void; // list pages: the "Filters" chip opens the filter sheet
  filterBadge?: number; // how many advanced filters (AMC, rating, risk) are on
  chips?: { key: K; label: string }[]; // dream pages pass only the categories their list holds; the sector list passes the sectors
}) {
  const [menu, setMenu] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  // Open with the selected chip in view (a collection can start on "Small Cap").
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>(".chip.active:not(.fchip):not(.sortchip)");
    if (el && on) el.scrollLeft = Math.max(0, on.offsetLeft - el.offsetLeft - 16);
  }, []);
  return (
    <div className="mf-filterbar">
      <div className="chip-row mf-chips2" ref={row}>
        {onFilters && (
          <button className={`chip fchip${filterBadge > 0 ? " active" : ""}`} onClick={onFilters} aria-label={filterBadge > 0 ? `Filter and sort, ${filterBadge} on` : "Filter and sort"}>
            <Icon name="dls-filter" size={16} />
            {filterBadge > 0 && <span className="chip-count">{filterBadge}</span>}
          </button>
        )}
        {!noSort && !onFilters && ( // on list pages Sort by lives in the filter sheet
          <button className={`chip sortchip${menu || sort !== "returns" ? " active" : ""}`} onClick={() => setMenu((v) => !v)}>
            Sort by <Icon name="caret-down" size={12} />
          </button>
        )}
        {(chips ?? (ROW_CHIPS as unknown as { key: K; label: string }[])).map((chip) => (
          <button
            key={chip.key}
            className={`chip${cat === chip.key ? " active" : ""}`}
            onClick={() => onCat(cat === chip.key ? "all" : chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {menu && (
        <>
          <button className="mf-menu-scrim" aria-label="Close" onClick={() => setMenu(false)} />
          <div className="mf-menu" role="menu">
            {(Object.keys(SORT_LABELS) as FundSort[]).map((key) => (
              <button
                key={key}
                role="menuitemradio"
                aria-checked={sort === key}
                className={sort === key ? "on" : ""}
                onClick={() => {
                  onSort(key);
                  setMenu(false);
                }}
              >
                {SORT_LABELS[key]}
                {sort === key && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// What the right-hand column shows and the list is ordered by. "EXP" (expense ratio) is reached only
// through Sort by; the "<>" button cycles the return periods and, from expense ratio, steps back to 3Y.
export type ReturnBasis = "1Y" | "3Y" | "5Y" | "EXP";
const NEXT_BASIS: Record<ReturnBasis, ReturnBasis> = { "1Y": "3Y", "3Y": "5Y", "5Y": "1Y", EXP: "3Y" };
const BASIS_LABEL: Record<ReturnBasis, string> = {
  "1Y": "1Y Returns",
  "3Y": "3Y Returns",
  "5Y": "5Y Returns",
  EXP: "Expense ratio",
};

// Basis and sort are one setting seen from two controls: the Sort by menu and the cycle button.
// Choosing "Expense ratio" in Sort by puts the button on expense ratio too; pressing the button (or choosing
// another sort) leaves it again.
export function useFundView() {
  const [basis, setBasisState] = useState<ReturnBasis>("3Y");
  const [sort, setSortState] = useState<FundSort>("returns");
  const setBasis = (next: ReturnBasis) => {
    setBasisState(next);
    if (next === "EXP") setSortState("cost");
    else if (sort === "cost") setSortState("returns");
  };
  const setSort = (next: FundSort) => {
    setSortState(next);
    if (next === "cost") setBasisState("EXP");
    else if (basis === "EXP") setBasisState("3Y");
  };
  return { basis, sort, setBasis, setSort };
}

// One tap steps 1Y -> 3Y -> 5Y -> 1Y (and from expense ratio back to 3Y); the label always names what is shown.
export function ReturnSwitch({ basis, onChange }: { basis: ReturnBasis; onChange: (next: ReturnBasis) => void }) {
  return (
    <button
      className="mf-retswitch"
      onClick={() => onChange(NEXT_BASIS[basis])}
      aria-label={`Showing ${BASIS_LABEL[basis]}. Change what is shown`}
    >
      <Icon name="caret-left-right" size={14} />
      <u>{BASIS_LABEL[basis]}</u>
    </button>
  );
}

// Right-hand side of a fund row: the return for the chosen period, or the expense ratio.
export function RowSide({ fund, basis, digits = 1, signed = true }: { fund: Fund; basis: ReturnBasis; digits?: number; signed?: boolean }) {
  if (basis === "EXP") {
    return (
      <span className="row-side">
        <b>{fund.expense.toFixed(2)}%</b>
        <small>Expense</small>
      </span>
    );
  }
  const value = basis === "1Y" ? fund.r1 : basis === "3Y" ? fund.r3 : fund.r5;
  const text = pct(value, digits);
  return (
    <span className="row-side">
      <b className={value >= 0 ? "up" : "down"}>{signed ? text : text.replace("+", "")}</b>
      <small>{basis}</small>
    </span>
  );
}

// "Equity · Small Cap" -> "Equity Small Cap" (asset class and sub-category read as one phrase on rows)
export const fundCategory = (fund: Fund) => fund.catLabel.replace(" · ", " ");

export function Stars({ n }: { n: number }) {
  return (
    <span className="mf-stars" aria-label={`${n}-star rating`}>
      {n} <Icon name="star-filled" size={12} />
    </span>
  );
}

// Full-screen takeover (Design.md: material-fullscreen, radius 0).
export function Screen({
  title,
  onBack,
  right,
  footer,
  children,
  tone,
  plainBack = false,
  hero,
  dockTitle,
  tight = false,
}: {
  title?: string;
  dockTitle?: ReactNode; // content (logo + name) that slides into the bar once the page's own heading (`[data-dock-anchor]`) has scrolled away; the bar then also gets its bottom line
  onBack: () => void;
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  tone?: "plain" | "tinted";
  plainBack?: boolean; // kept for the callers; every top bar now has the same bare chevron (DLS app bar)
  hero?: ReactNode; // image header: the top bar floats over it, then turns solid once it has scrolled away
  tight?: boolean; // a line of sub text sits right under the title: no spare padding between the bar and the content
}) {
  const [solid, setSolid] = useState(false);
  const [docked, setDocked] = useState(false); // the filters are stuck under the bar: drop the line between them
  const [titleIn, setTitleIn] = useState(false); // the page heading is gone: its name now lives in the bar
  return (
    <div className={`mf-screen${tone === "tinted" ? " tinted" : ""}${hero ? " has-hero" : ""}${tight ? " tight" : ""}`}>
      <header className={`mf-head${plainBack ? " plain" : ""}${hero ? " over" : ""}${solid ? " solid" : ""}${docked ? " docked" : ""}${dockTitle ? " has-dock-title" : ""}${titleIn ? " title-in" : ""}`}>
        <button className={`mf-back${plainBack ? " plain" : ""}`} onClick={onBack} aria-label="Back">
          <Icon name="chevron-left" size={24} />
        </button>
        {title ? (
          <h1>{title}</h1>
        ) : (
          dockTitle && (
            // The h1 is the mask (overflow hidden); the span inside rises out of it. Hidden from screen readers: the page already has this name as its heading.
            <h1 className={`dock-title${titleIn ? " in" : ""}`} aria-hidden="true">
              <span className="dock-inner">{dockTitle}</span>
            </h1>
          )
        )}
        <span className="mf-head-right">{right}</span>
      </header>
      <div
        className="mf-body"
        onScroll={
          hero || dockTitle
            ? (e) => {
                const body = e.currentTarget;
                if (dockTitle) {
                  // hand the name over to the bar just before the heading has fully gone under it
                  const anchor = body.querySelector<HTMLElement>("[data-dock-anchor]");
                  setTitleIn(!!anchor && anchor.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 8);
                }
                if (!hero) return;
                // the floating bar gets its own background once the header image has scrolled up under it
                const heroEl = body.querySelector<HTMLElement>(".bucket-hero");
                setSolid(body.scrollTop > (heroEl ? heroEl.offsetHeight : 260) - 120);
                const dock = body.querySelector(".mf-dock");
                const bar = body.previousElementSibling;
                setDocked(!!dock && !!bar && dock.getBoundingClientRect().top <= bar.getBoundingClientRect().bottom + 1);
              }
            : undefined
        }
      >
        {hero}
        {children}
      </div>
      {footer && <footer className="mf-foot">{footer}</footer>}
    </div>
  );
}

// The order, payment and status screens (the purchase, SIP, redeem and orders flows) keep the layout they were designed with:
// a bare top bar with the DLS chevron and a 16px title, no status-bar space above it. `.vflow` scopes those styles; the fund page, the
// list pages and the rest use Screen above.
export function FlowScreen({
  title,
  heading,
  onBack,
  right,
  footer,
  children,
  tone,
  className,
  backdrop,
}: {
  title?: string;
  heading?: ReactNode; // custom header content in place of the title (order pads: the fund line)
  onBack: () => void;
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  tone?: "plain" | "tinted";
  className?: string;
  backdrop?: ReactNode; // full-bleed layer behind the header and body (order pads: the dot field)
}) {
  return (
    <div className={`mf-screen vflow${tone === "tinted" ? " tinted" : ""}${className ? ` ${className}` : ""}`}>
      {backdrop}
      <header className="mf-head">
        <button className="mf-back" onClick={onBack} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        {heading ?? (title && <h1>{title}</h1>)}
        <span className="mf-head-right">{right}</span>
      </header>
      <div className="mf-body">{children}</div>
      {footer && <footer className="mf-foot">{footer}</footer>}
    </div>
  );
}

// Artwork placed like its Figma frame (see `Art` in store.tsx). The box is positioned by the parent's CSS (`.bucket-art`, `.dream-art`).
// With `frame` (the Figma frame width) the box is pinned to the RIGHT edge instead of the left, so the picture keeps its
// distance from the right edge on any screen width (identical to the design at `frame`). `mirror` is a flipped copy placed
// just left of the box: it covers the strip that opens up on screens wider than the frame, without a seam.
export function ArtBox({ art, className, frame, mirror }: { art: Art; className: string; frame?: number; mirror?: boolean }) {
  const [l, t, w, h] = art.fit ?? [0, 0, 100, 100];
  const place = frame === undefined ? { left: art.x } : { right: mirror ? frame - art.x : frame - (art.x + art.w) };
  return (
    <span
      className={className}
      style={{ ...place, top: art.y, width: art.w, height: art.h, transform: mirror ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
      <img src={asset(art.src)} alt="" draggable={false} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }} />
    </span>
  );
}

// A fund page widget that folds away: the title is the toggle, the chevron turns over when it is open.
// The body stays mounted (so the calculator keeps its state) and is made inert while folded.
export function Fold({
  title,
  summary,
  children,
  defaultOpen = true,
  onOpenChange,
}: {
  title: string;
  summary?: ReactNode; // one short value shown in the closed header (fades out when open), so a closed row still says something
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(defaultOpen);
  const setOpen = (next: (o: boolean) => boolean) => {
    const value = next(open);
    setOpenState(value);
    onOpenChange?.(value);
  };
  const bodyId = useId();
  return (
    <section className={`mf-section fold${open ? " open" : ""}`}>
      <h3>
        <button type="button" className="fold-head" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
          {title}
          <span className="fold-end">
            {summary != null && <span className="fold-summary">{summary}</span>}
            <Icon name="caret-down" size={16} />
          </span>
        </button>
      </h3>
      <div className="fold-body" id={bodyId} inert={!open}>
        <div className="fold-inner">{children}</div>
      </div>
    </section>
  );
}

export function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mf-kv">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <b>{value}</b>
    </div>
  );
}

export function Notice({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warn" | "error";
  icon?: "info" | "warning-circle" | "clock" | "shield-check";
  children: ReactNode;
}) {
  return (
    <div className={`mf-notice ${tone}`}>
      <Icon name={icon ?? (tone === "info" ? "info" : "warning-circle")} size={16} />
      <p>{children}</p>
    </div>
  );
}

export function Disclaimer() {
  return <p className="mf-disclaimer">{DISCLAIMER}</p>;
}

// Prototype-only control, kept visibly separate from the product UI.
export function ProtoLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="proto-link" onClick={onClick}>
      Prototype · {children}
    </button>
  );
}

export function Spinner({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mf-wait" role="status">
      <i className="mf-spinner" />
      <b>{label}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

// Bottom sheet over the current screen (Figma 28:6520 "Limit"): scrim, grey L2 panel,
// title, body, one primary button. Slides down before unmounting.
export function Sheet({
  title,
  action = "Got it",
  onClose,
  onAction,
  disabled = false,
  className,
  children,
}: {
  title: string;
  className?: string;
  action?: string;
  onClose: () => void;
  onAction?: () => void; // runs after the sheet slides away, in place of onClose
  disabled?: boolean;
  children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [acted, setActed] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className={`mf-sheet-layer${closing ? " closing" : ""}`}>
      <button className="mf-sheet-scrim" aria-label="Close" onClick={() => setClosing(true)} />
      <div
        className={`mf-sheet${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && (acted && onAction ? onAction() : onClose())}
      >
        <h2>{title}</h2>
        <div className="mf-sheet-body">{children}</div>
        <div className="mf-sheet-foot">
          <button
            className="mf-btn solid wide"
            disabled={disabled}
            onClick={() => {
              setActed(true);
              setClosing(true);
            }}
            autoFocus
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SheetLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="mf-sheet-line">
      <Icon name={icon} size={20} />
      <p>{children}</p>
    </div>
  );
}

// ---- Keypad -----------------------------------------------------------------

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"];
// Order pad (Figma 25:2310): a decimal point in place of "00", and the backspace icon.
const DECIMAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export function Keypad({ onKey, decimal = false }: { onKey: (key: string) => void; decimal?: boolean }) {
  return (
    <div className={`mf-keypad${decimal ? " pad" : ""}`} role="group" aria-label="Amount keypad">
      {(decimal ? DECIMAL_KEYS : KEYS).map((key) => (
        <button
          key={key}
          className={key === "." ? "dot" : undefined}
          onClick={() => onKey(key)}
          aria-label={key === "del" ? "Delete" : key === "." ? "Decimal point" : key}
        >
          {key === "del" ? decimal ? <Icon name="backspace" size={20} /> : "⌫" : key}
        </button>
      ))}
    </div>
  );
}

// Whole rupees up to maxDigits, plus up to two decimals when the pad has a "." key.
export function applyKey(current: string, key: string, maxDigits = 8): string {
  if (key === "del") return current.slice(0, -1);
  if (key === "." && current === "") return "0.";
  const next = (current === "0" && key !== "." ? "" : current) + key;
  if (!/^\d*(\.\d{0,2})?$/.test(next)) return current;
  return next.split(".")[0].length > maxDigits ? current : next;
}

// ---- Rolling amount -----------------------------------------------------------
// Odometer-style figure for order pads: a digit that changes rolls up out of its slot
// while the new one rises from below, both blurred in transit. Digits are keyed by
// their index in the raw value, so Indian grouping moving a comma doesn't make the
// unchanged digits roll. Backspace drops the removed digits down instead.

type Glyph = { ch: string; key: string };

// "500005.5" -> 5,00,005.5 as glyphs; digits keyed d<raw index>, separators by the digit they follow.
function glyphs(value: string): Glyph[] {
  const [whole, frac] = value.split(".");
  const out: Glyph[] = [];
  for (let i = 0; i < whole.length; i++) {
    const left = whole.length - i;
    if (i > 0 && (left === 3 || (left > 3 && (left - 3) % 2 === 0))) out.push({ ch: ",", key: `c${i}` });
    out.push({ ch: whole[i], key: `d${i}` });
  }
  if (frac !== undefined) {
    out.push({ ch: ".", key: "dot" });
    for (let i = 0; i < frac.length; i++) out.push({ ch: frac[i], key: `d${whole.length + 1 + i}` });
  }
  return out;
}

function RollDigit({ ch, animateMount }: { ch: string; animateMount: boolean }) {
  const last = useRef(ch);
  const [n, setN] = useState(0); // bumps on every change, remounting the glyph to replay its roll
  const [from, setFrom] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (last.current === ch) return;
    setFrom(last.current);
    setN((x) => x + 1);
    last.current = ch;
  }, [ch]);
  return (
    <span className="roll">
      {from !== null && (
        <span key={`out${n}`} className="roll-out" aria-hidden="true" onAnimationEnd={() => setFrom(null)}>
          {from}
        </span>
      )}
      <span key={`in${n}`} className={n > 0 || animateMount ? "roll-in" : undefined}>
        {ch}
      </span>
    </span>
  );
}

export function RollingAmount({ value }: { value: string }) {
  const mounted = useRef(false);
  const prev = useRef(value);
  const [drop, setDrop] = useState<{ text: string; n: number } | null>(null);
  useLayoutEffect(() => {
    const was = prev.current.replace(/\D/g, "");
    const now = value.replace(/\D/g, "");
    if (now.length < was.length && was.startsWith(now))
      setDrop((d) => ({ text: prev.current.slice(value.length), n: (d?.n ?? 0) + 1 }));
    prev.current = value;
  }, [value]);
  useEffect(() => {
    mounted.current = true;
  }, []);
  return (
    <span className="mf-roll">
      {glyphs(value).map((g) =>
        g.key.startsWith("d") ? (
          <RollDigit key={g.key} ch={g.ch} animateMount={mounted.current} />
        ) : (
          <span key={g.key}>{g.ch}</span>
        ),
      )}
      {drop && (
        <span key={drop.n} className="roll-drop" aria-hidden="true" onAnimationEnd={() => setDrop(null)}>
          {drop.text}
        </span>
      )}
    </span>
  );
}

export function AmountField({ value, error }: { value: string; error?: boolean }) {
  const n = Number(value || 0);
  const shown = n ? n.toLocaleString("en-IN") : "";
  return (
    <div className="mf-amount">
      <div className={`mf-amount-field${error ? " error" : ""}`}>
        <span className="rs">₹</span>
        <b>{shown || <em>0</em>}</b>
        <i className="caret" />
      </div>
      <small>{rupeesInWords(n) || "Enter an amount"}</small>
    </div>
  );
}

// ---- Riskometer ---------------------------------------------------------------

/* One colour family per risk: the levels group in pairs, Low and Low to Moderate green, Moderate and Moderately High amber,
   High and Very High red. The lit segments shade along the dial from `from` to `to` (Figma "Risk Meter" green / amber / red). */
export const RISK_TONES = [
  { name: "up", from: "color-mix(in srgb, var(--positive-surface) 28%, var(--fixed-white))", to: "var(--positive-surface)" },
  { name: "warn", from: "var(--warning-surface)", to: "color-mix(in srgb, var(--warning-surface) 42%, var(--fixed-white))" },
  { name: "down", from: "var(--negative-surface)", to: "color-mix(in srgb, var(--negative-surface) 72%, var(--fixed-white))" },
] as const;
export const riskTone = (levelIndex: number) => RISK_TONES[Math.floor(levelIndex / 2)];


/* The risk meter (Figma "Risk Meter", 97:2325 / 97:2236): a 245 degree dial of 12 equal segments, 2 for each of the 6 SEBI
   levels, a thin outer ring, white ticks between segments, and the segments up to this fund's level lit in the level's own
   one colour family for the fund's level (green, amber or red, shading along the dial) with a glow on the last ones. Full size has the level's name in the middle; `compact` (about half size) has the level number and "of 6". */
const GAUGE = { cx: 130, cy: 130, rIn: 70, rBand: 118, rOut: 130, start: 148.06, step: 20.41 };

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [GAUGE.cx + r * Math.cos(a), GAUGE.cy + r * Math.sin(a)] as const;
};

function sector(r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  const f = (n: number) => n.toFixed(2);
  return `M ${f(x0)} ${f(y0)} A ${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} A ${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)} Z`;
}

export function Riskometer({ risk, compact, size }: { risk: Risk; compact?: boolean; size?: "full" | "md" | "sm" }) {
  const sz = size ?? (compact ? "sm" : "full");
  const level = riskLevels.indexOf(risk);
  const lit = (level + 1) * 2; // segments lit
  const tone = riskTone(level); // all lit segments are one colour family
  const { start, step } = GAUGE;
  // All 12 lit segments are always drawn and faded in or out, so changing the level animates: new segments light up one after
  // another from where the old level ended, removed ones go out from the tip back (35ms and 18ms apart).
  const before = useRef(0);
  useEffect(() => {
    before.current = lit;
  }, [lit]);
  const was = before.current;
  return (
    <div className={`rg${sz === "full" ? "" : ` ${sz}`}`} role="img" aria-label={`Riskometer: ${risk}, level ${level + 1} of 6`}>
      <svg width="260" height="232" viewBox="0 0 260 232" aria-hidden="true">
        <path className="rg-ring" d={sector(GAUGE.rBand, GAUGE.rOut, start, start + step * 12)} />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={`b${i}`} className="rg-seg" d={sector(GAUGE.rIn, GAUGE.rBand, start + step * i, start + step * (i + 1))} />
        ))}
        {Array.from({ length: 12 }, (_, i) => {
          const on = i < lit;
          const delay = on ? Math.max(0, i - was) * 35 : Math.max(0, was - 1 - i) * 18;
          const pct = lit > 1 ? Math.min(100, Math.round((i / (lit - 1)) * 100)) : 100;
          return (
            <path
              key={`l${i}`}
              className={`rg-lit${on ? " on" : ""}${on && i >= lit - 2 ? " tip" : ""}`}
              style={{ "--c": `color-mix(in srgb, ${tone.to} ${pct}%, ${tone.from})`, transitionDelay: `${delay}ms, 0ms` } as CSSProperties}
              d={sector(GAUGE.rIn, GAUGE.rBand, start + step * i, start + step * (i + 1))}
            />
          );
        })}
        {Array.from({ length: 11 }, (_, i) => {
          const [x0, y0] = pt(GAUGE.rIn, start + step * (i + 1));
          const [x1, y1] = pt(GAUGE.rOut, start + step * (i + 1));
          return <line key={`t${i}`} className="rg-tick" x1={x0} y1={y0} x2={x1} y2={y1} />;
        })}
      </svg>
      <div className="rg-center">
        {sz === "full" ? (
          <>
            <b className={risk.length > 10 ? "long" : undefined}>{risk}</b>
            <span>Level {level + 1} of 6</span>
          </>
        ) : (
          // smaller dials: the level number with "of 6" under it, the name goes beside or under the dial
          <>
            <b>{level + 1}</b>
            <span>of 6</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Category and collection icons ---------------------------------------------------
// Line icons on the 24px grid, same stroke as the bottom-bar icons.

export type IconKey = CategoryKey | "trend" | "calendar" | "bars" | "star" | "coins";

const trend = (
  <>
    <path d="M3.5 17.5l5.5-5.5 4 4 7.5-7.5" />
    <path d="M15.5 8.5h5v5" />
  </>
);

const ICON_PATHS: Record<IconKey, ReactNode> = {
  index: trend,
  trend,
  large: (
    <>
      <path d="M4.5 20.5V8.5l7-4v16" />
      <path d="M11.5 10.5l8 2.5v7.5" />
      <path d="M2.5 20.5h19" />
      <path d="M8 10.5v.01M8 14v.01M15.5 16v.01" />
    </>
  ),
  flexi: (
    <>
      <circle cx="8.5" cy="14.5" r="4.5" />
      <circle cx="17" cy="8" r="3.5" />
      <circle cx="17.5" cy="17.5" r="2" />
    </>
  ),
  mid: (
    <>
      <path d="M6 20V11M12 20V6M18 20v-6" />
      <path d="M3.5 20.5h17" />
    </>
  ),
  small: (
    <>
      <path d="M7 17v-5M12 17V8M17 17v-6" />
      <path d="M4 20h16" />
    </>
  ),
  bars: (
    <>
      <path d="M7 17v-5M12 17V8M17 17v-6" />
      <path d="M4 20h16" />
    </>
  ),
  debt: (
    <>
      <path d="M3 9.5l9-5.5 9 5.5" />
      <path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7" />
      <path d="M3 20h18" />
    </>
  ),
  liquid: <path d="M12 3.5c-3.8 4.3-6.5 7.4-6.5 11a6.5 6.5 0 0013 0c0-3.6-2.7-6.7-6.5-11z" />,
  elss: (
    <>
      <path d="M19 5L5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 2.8V6.6M16 2.8V6.6" />
      <path d="M8 14h2M14 14h2M8 17h2" strokeWidth="1.4" />
    </>
  ),
  star: <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  gold: (
    <>
      <ellipse cx="12" cy="7" rx="6.5" ry="3" />
      <path d="M5.5 7v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V7" />
      <path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
    </>
  ),
  theme: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12v.01" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="7" rx="6.5" ry="3" />
      <path d="M5.5 7v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V7" />
      <path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
    </>
  ),
};

// A line icon on a white disc (small = category card, big = collection tile).
export function CategoryIcon({ cat, big = false }: { cat: IconKey; big?: boolean }) {
  const size = big ? 24 : 20;
  return (
    <span className={`cat-ico${big ? " big" : ""}`} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[cat]}
      </svg>
    </span>
  );
}

/* DLS segment switcher (Base DLS, "Segment switcher", Type=subtle, Track=standard, Size=medium): a filled track (surface/L3), 2px
   inset and gap, 29px segments, a selected pill (surface/L1) that slides to the chosen segment over 240ms. Labels are 14px,
   Medium when chosen, Regular and secondary otherwise. Equal-width segments, so the label going bold never resizes anything. */
export function SegmentSwitcher<T extends string>({
  label,
  value,
  onChange,
  options,
  wide,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  wide?: boolean; // fill the width instead of hugging the labels
  className?: string;
}) {
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  return (
    <div
      className={`seg${wide ? " wide" : ""}${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={label}
      style={{ "--i": index, "--n": options.length } as CSSProperties}
    >
      <i className="seg-pill" aria-hidden="true" />
      {options.map(([key, text]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? "on" : ""} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

// A fund manager's official photo, or their initials when the AMC publishes none (`photo` is a file in public/assets;
// `zoom` crops in a little, for photos that come with a ring or margin).
export function ManagerAvatar({ name, photo, size = 40, zoom }: { name: string; photo?: string; size?: number; zoom?: number }) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <span className="mgr-avatar" style={{ width: size, height: size, fontSize: size < 32 ? 11 : size <= 48 ? 12 : size <= 64 ? 16 : 24 }} /* DLS type sizes */ aria-hidden="true">
      {photo ? <img src={asset(photo)} alt="" draggable={false} style={zoom ? { transform: `scale(${zoom})` } : undefined} /> : initials}
    </span>
  );
}

/* The verified mark: an eight-lobed seal with a tick, in the SAHI accent (a lighter pink on dark, see .vbadge in mf.css). It says "a SEBI qualified
   researcher". When `animate` is set it plays once as its surface appears: the seal turns in with a little overshoot, the tick draws itself, then a
   soft glint crosses the seal. Rare and first-time, so it is allowed to be delightful; it never loops and never responds to hover. */
const SEAL = "M12.00 0.61 L12.49 0.66 L12.98 0.83 L13.44 1.10 L13.86 1.43 L14.26 1.79 L14.64 2.15 L15.00 2.47 L15.37 2.74 L15.75 2.94 L16.16 3.07 L16.61 3.14 L17.10 3.16 L17.62 3.18 L18.16 3.20 L18.69 3.28 L19.21 3.41 L19.67 3.63 L20.06 3.94 L20.37 4.33 L20.59 4.79 L20.72 5.31 L20.80 5.84 L20.82 6.38 L20.84 6.90 L20.86 7.39 L20.93 7.84 L21.06 8.25 L21.26 8.63 L21.53 9.00 L21.85 9.36 L22.21 9.74 L22.57 10.14 L22.90 10.56 L23.17 11.02 L23.34 11.51 L23.39 12.00 L23.34 12.49 L23.17 12.98 L22.90 13.44 L22.57 13.86 L22.21 14.26 L21.85 14.64 L21.53 15.00 L21.26 15.37 L21.06 15.75 L20.93 16.16 L20.86 16.61 L20.84 17.10 L20.82 17.62 L20.80 18.16 L20.72 18.69 L20.59 19.21 L20.37 19.67 L20.06 20.06 L19.67 20.37 L19.21 20.59 L18.69 20.72 L18.16 20.80 L17.62 20.82 L17.10 20.84 L16.61 20.86 L16.16 20.93 L15.75 21.06 L15.37 21.26 L15.00 21.53 L14.64 21.85 L14.26 22.21 L13.86 22.57 L13.44 22.90 L12.98 23.17 L12.49 23.34 L12.00 23.39 L11.51 23.34 L11.02 23.17 L10.56 22.90 L10.14 22.57 L9.74 22.21 L9.36 21.85 L9.00 21.53 L8.63 21.26 L8.25 21.06 L7.84 20.93 L7.39 20.86 L6.90 20.84 L6.38 20.82 L5.84 20.80 L5.31 20.72 L4.79 20.59 L4.33 20.37 L3.94 20.06 L3.63 19.67 L3.41 19.21 L3.28 18.69 L3.20 18.16 L3.18 17.62 L3.16 17.10 L3.14 16.61 L3.07 16.16 L2.94 15.75 L2.74 15.37 L2.47 15.00 L2.15 14.64 L1.79 14.26 L1.43 13.86 L1.10 13.44 L0.83 12.98 L0.66 12.49 L0.61 12.00 L0.66 11.51 L0.83 11.02 L1.10 10.56 L1.43 10.14 L1.79 9.74 L2.15 9.36 L2.47 9.00 L2.74 8.63 L2.94 8.25 L3.07 7.84 L3.14 7.39 L3.16 6.90 L3.18 6.38 L3.20 5.84 L3.28 5.31 L3.41 4.79 L3.63 4.33 L3.94 3.94 L4.33 3.63 L4.79 3.41 L5.31 3.28 L5.84 3.20 L6.38 3.18 L6.90 3.16 L7.39 3.14 L7.84 3.07 L8.25 2.94 L8.63 2.74 L9.00 2.47 L9.36 2.15 L9.74 1.79 L10.14 1.43 L10.56 1.10 L11.02 0.83 L11.51 0.66Z";
export function VerifiedBadge({ size = 16, animate = false, label = "Verified by SEBI" }: { size?: number; animate?: boolean; label?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`vbadge${animate ? " anim" : ""}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <defs>
        <clipPath id={`vb-${id}`}>
          <path d={SEAL} />
        </clipPath>
      </defs>
      <path className="vbadge-seal" d={SEAL} />
      <g clipPath={`url(#vb-${id})`}>
        <rect className="vbadge-glint" x="-10" y="0" width="8" height="24" />
      </g>
      <path className="vbadge-check" d="M7.4 12.4l3.1 3.1 6.1-6.5" pathLength={1} />
    </svg>
  );
}
