import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../assets";
import { Icon, type IconName } from "../ui/Icon";
import { riskLevels, type CategoryKey, type Fund, type Risk } from "./data";
import { pct, rupeesInWords } from "./format";
import "./filter.css";

// AMC logos (official marks, square). Files sit in public/assets as amc-*.png.
const AMC_LOGO: Record<string, string> = {
  "Aditya Birla": "amc-aditya-birla.png",
  Edelweiss: "amc-edelweiss.png",
  Groww: "amc-groww.png",
  Kotak: "amc-kotak.png",
  Tata: "amc-tata.png",
  Bandhan: "amc-bandhan.png",
  Franklin: "amc-franklin.png",
  HDFC: "amc-hdfc.png",
  "ICICI Prudential": "amc-icici.png",
  "JM Financial": "amc-jm.png",
  "Mirae Asset": "amc-mirae.png",
  "Motilal Oswal": "amc-motilal.png",
  "Nippon India": "amc-nippon.png",
  PPFAS: "amc-ppfas.png",
  Quant: "amc-quant.png",
  SBI: "amc-sbi.png",
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

export function Mark({ kind, on }: { kind: "radio" | "check"; on: boolean }) {
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
      {n} ★
    </span>
  );
}

// Full-screen takeover (Design.md: material-fullscreen, radius 0).
export function Screen({
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
    <div className={`mf-screen${tone === "tinted" ? " tinted" : ""}${className ? ` ${className}` : ""}`}>
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

// Bottom sheet over the current screen (Figma 28:6520 "Limit"): scrim, grey L2 panel,
// title, body, one primary button. Slides down before unmounting.
export function Sheet({
  title,
  heading,
  action = "Got it",
  onClose,
  onAction,
  disabled = false,
  className,
  children,
}: {
  title: string;
  heading?: ReactNode; // replaces the title line (e.g. a tab bar); title still names the dialog
  className?: string;
  action?: string;
  onClose: () => void;
  onAction?: () => void; // runs after the sheet slides away, in place of onClose
  disabled?: boolean;
  children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [acted, setActed] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  // Focus the button without letting the browser scroll the page to it while the sheet is still sliding up.
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, []);
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
        {heading ?? <h2>{title}</h2>}
        <div className="mf-sheet-body">{children}</div>
        <div className="mf-sheet-foot">
          <button
            className="mf-btn solid wide"
            disabled={disabled}
            onClick={() => {
              setActed(true);
              setClosing(true);
            }}
            ref={primary}
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
          {key === "del" ? <Icon name="backspace" size={24} /> : key}
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

const RISK_COLORS = [
  "var(--positive-text-subtle)",
  "var(--positive-text)",
  "var(--warning-surface)",
  "var(--negative-text-subtle)",
  "var(--negative-surface)",
  "var(--negative-bold)",
];

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function Riskometer({ risk }: { risk: Risk }) {
  const level = riskLevels.indexOf(risk);
  const seg = Math.PI / 6;
  const needle = Math.PI + seg * level + seg / 2;
  const nx = 100 + 58 * Math.cos(needle);
  const ny = 100 + 58 * Math.sin(needle);
  return (
    <div className="riskometer">
      <svg viewBox="0 0 200 116" role="img" aria-label={`Riskometer: ${risk}`}>
        {RISK_COLORS.map((color, i) => (
          <path
            key={color}
            d={arc(100, 100, 74, Math.PI + seg * i + 0.03, Math.PI + seg * (i + 1) - 0.03)}
            stroke={color}
            strokeWidth="16"
            strokeLinecap="butt"
            fill="none"
            opacity={i === level ? 1 : 0.38}
          />
        ))}
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill="var(--text-primary)" />
      </svg>
      <b>{risk}</b>
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
  theme: trend,
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

// Pill switch with a sliding thumb.
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: [T, string, boolean?][]; // [key, label, disabled]
  className?: string;
}) {
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  return (
    <div
      className={`bk-seg wide${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={label}
      style={{ "--i": index, "--n": options.length } as CSSProperties}
    >
      <i className="bk-seg-pill" aria-hidden="true" />
      {options.map(([key, text, off]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? "on" : ""} disabled={off} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}
