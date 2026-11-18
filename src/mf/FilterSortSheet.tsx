import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Mark } from "./parts";

export type FilterGroup = { key: string; label: string; options: string[] };
export type Picks = Record<string, string[]>;

// The fund filter's sheet, for any list: a Filter | Sort by switch with a close button, the groups in a rail on the left,
// the picked group's options in a grey panel on the right (several can be ticked), Clear all and Apply at the foot.
export function FilterSortSheet<K extends string>({
  groups,
  sorts,
  picks,
  sort,
  defaultSort,
  onApply,
  onClose,
}: {
  groups: FilterGroup[];
  sorts: { key: K; label: string }[];
  picks: Picks;
  sort: K;
  defaultSort: K;
  onApply: (picks: Picks, sort: K) => void;
  onClose: () => void;
}) {
  const sortOnly = groups.length === 0; // a list with nothing to filter: just the sort options
  const [tab, setTab] = useState<"filter" | "sort">(sortOnly ? "sort" : "filter");
  const [group, setGroup] = useState(groups[0]?.key ?? "");
  const [draft, setDraft] = useState<Picks>(picks);
  const [draftSort, setDraftSort] = useState<K>(sort);
  const [closing, setClosing] = useState(false);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const picked = (key: string) => draft[key] ?? [];
  const toggle = (key: string, option: string) =>
    setDraft((d) => ({ ...d, [key]: (d[key] ?? []).includes(option) ? d[key].filter((x) => x !== option) : [...(d[key] ?? []), option] }));
  const dirty = groups.some((g) => picked(g.key).length > 0) || draftSort !== defaultSort;
  const current = groups.find((g) => g.key === group) ?? groups[0];

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
        aria-label="Filter and sort"
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) {
            if (applied) onApply(draft, draftSort);
            onClose();
          }
        }}
      >
        <header className="mf-fsheet-head">
          {sortOnly ? (
            <h2>Sort by</h2>
          ) : (
            <div className="mf-fseg" role="tablist">
            <button role="tab" aria-selected={tab === "filter"} className={tab === "filter" ? "on" : ""} onClick={() => setTab("filter")}>
              Filter
            </button>
            <button role="tab" aria-selected={tab === "sort"} className={tab === "sort" ? "on" : ""} onClick={() => setTab("sort")}>
              Sort by
            </button>
          </div>
          )}
          <button className="mf-fsheet-x" aria-label="Close" onClick={() => setClosing(true)}>
            <Icon name="x" size={24} />
          </button>
        </header>
        <div className="mf-fsheet-body">
          {tab === "sort" ? (
            <div className="mf-fpanel wide" role="radiogroup" aria-label="Sort by">
              {sorts.map((o) => (
                <Opt key={o.key} kind="radio" on={draftSort === o.key} onClick={() => setDraftSort(o.key)}>
                  {o.label}
                </Opt>
              ))}
            </div>
          ) : (
            <>
              <nav className="mf-frail" aria-label="Filter by">
                {groups.map((g) => (
                  <button key={g.key} className={group === g.key ? "on" : ""} aria-current={group === g.key} onClick={() => setGroup(g.key)}>
                    <span>{g.label}</span>
                    {picked(g.key).length > 0 && <i>{picked(g.key).length}</i>}
                  </button>
                ))}
              </nav>
              {current && (
                <div className="mf-fpanel" role="group" aria-label={current.label} key={current.key}>
                  {current.options.map((o) => (
                    <Opt key={o} kind="check" on={picked(current.key).includes(o)} onClick={() => toggle(current.key, o)}>
                      {o}
                    </Opt>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <footer className="mf-fsheet-foot">
          <button
            className="mf-btn"
            disabled={!dirty}
            onClick={() => {
              setDraft({});
              setDraftSort(defaultSort);
            }}
          >
            Clear all
          </button>
          <button
            className="mf-btn solid"
            onClick={() => {
              setApplied(true);
              setClosing(true);
            }}
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}
