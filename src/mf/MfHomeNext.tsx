import { useEffect, useRef, useState, type ReactNode } from "react";
import { asset } from "../assets";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import { compare, type CategoryKey, type Fund } from "./data";
import { pct } from "./format";
import { ArtBox, type GoalArtSpec } from "./GoalArt";
import { BasketsSection } from "./Baskets";
import { Alerts } from "./MfHome";
import { FilterRow, FundMark, fundCategory, ReturnSwitch, RowSide, sortFunds, Stars, useFundView } from "./parts";
import { nextFunds, sectors, themeOf } from "./sectors";
import { useMf, type ListSpec } from "./store";

// The Order 2.0 home. The core home (MfHome) stays as it is; this one is shown instead when Order 2.0 is on.
// Same widgets, new captions and art, plus "Invest in a sector", illustrated goal cards and a sign-off.
// Lists opened from here use `withExtras`, so they include the sector and extra funds.

const MARKET_RISK = "Mutual fund investments are subject to market risks, read all scheme related documents carefully.";

// 1. Banner to start investing
function Banner() {
  const { push } = useMf();
  return (
    <div className="mf-banner">
      <img className="mf-banner-dots" src={asset("mf-banner-dots.png")} alt="" draggable={false} />
      <div className="mf-intro">
        <div className="mf-intro-copy">
          <h2>Start investing with as little as ₹100</h2>
          <p>₹0 commission • Withdraw anytime</p>
          <button
            onClick={() =>
              push({
                name: "list",
                spec: {
                  title: "SIP from ₹100",
                  sipOnly: true,
                  withExtras: true,
                  caption: "A SIP invests a set amount every month. Start at ₹100, stop any time.",
                },
              })
            }
          >
            Start a SIP
          </button>
        </div>
        <img className="mf-intro-art" src={asset("mf-banner-path.png")} alt="" draggable={false} />
      </div>
    </div>
  );
}

// 2. Top Performing Funds
function TopPerforming() {
  const { push } = useMf();
  const list = nextFunds
    .filter((fund) => fund.catLabel.startsWith("Equity"))
    .sort((a, b) => b.r3 - a.r3)
    .slice(0, 7);
  return (
    <Block
      title="Top Performing Funds"
      action={
        <button
          className="text-link"
          onClick={() =>
            push({
              name: "list",
              spec: {
                title: "Top performing funds",
                equityOnly: true,
                withExtras: true,
                caption: "Equity funds with the biggest 3-year gains. Past returns aren't a promise.",
              },
            })
          }
        >
          View all
        </button>
      }
    >
      <HScroll>
        {list.map((fund) => (
          <button className="top-card" key={fund.id} onClick={() => push({ name: "fund", fundId: fund.id })}>
            <FundMark fund={fund} size={40} />
            <Stars n={fund.stars} />
            <b>{fund.name.replace(/ Fund$/, "")}</b>
            <strong className={fund.r3 >= 0 ? "up" : "down"}>{pct(fund.r3, 1).replace("+", "")}</strong>
            <em>3Y</em>
          </button>
        ))}
      </HScroll>
    </Block>
  );
}

// 3. Invest in a sector: one chip per sector, a panel with its three best funds.
// The mark is a line drawing on the 24px grid, same stroke as the rest of the icons.
const SECTOR_MARK: Record<string, ReactNode> = {
  Defence: (
    <>
      <path d="M12 3.5l7 2.5v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
      <path d="M9 11l3-2.4 3 2.4M9 14.5l3-2.4 3 2.4" />
    </>
  ),
  IT: <path d="M8.5 8L4 12l4.5 4M15.5 8l4.5 4-4.5 4M13.5 6.5l-3 11" />,
  AI: (
    <>
      <path d="M10.5 4l1.9 5.1 5.1 1.9-5.1 1.9L10.5 18l-1.9-5.1L3.5 11l5.1-1.9z" />
      <path d="M18 15.5v4M16 17.5h4" />
    </>
  ),
  Commodities: (
    <>
      <ellipse cx="12" cy="7" rx="6.5" ry="3" />
      <path d="M5.5 7v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V7" />
      <path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
    </>
  ),
  Healthcare: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  Banking: <path d="M3.5 9.5L12 4l8.5 5.5zM6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6M4 19.5h16" />,
};

function SectorMark({ sector }: { sector: string }) {
  return (
    <span className="fund-mark bi-mark" style={{ width: 40, height: 40 }} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SECTOR_MARK[sector]}
      </svg>
    </span>
  );
}

// A fund row as the home lists show it: logo, name, "category • rating", and the figure on the right.
function HomeFundRow({
  fund,
  basis,
  index,
}: {
  fund: Fund;
  basis: Parameters<typeof RowSide>[0]["basis"];
  index?: number;
}) {
  const { push } = useMf();
  return (
    <li style={index === undefined ? undefined : ({ "--i": index } as React.CSSProperties)}>
      <button className="list-row fund-row" onClick={() => push({ name: "fund", fundId: fund.id })}>
        <FundMark fund={fund} />
        <span className="row-main">
          <b>{fund.name}</b>
          <small>
            {fundCategory(fund)} • <Stars n={fund.stars} />
          </small>
        </span>
        <RowSide fund={fund} basis={basis} digits={2} signed={false} />
      </button>
    </li>
  );
}

function Sectors() {
  const { push } = useMf();
  const [key, setKey] = useState(sectors[0].key);
  const { basis, setBasis } = useFundView();
  const sector = sectors.find((item) => item.key === key)!;
  const inSector = sortFunds(nextFunds.filter((fund) => themeOf(fund) === key), "returns", basis);

  return (
    <Block title="Invest in a sector">
      <div className="mf-filterbar bi-tags">
        <div className="chip-row mf-chips2" role="tablist" aria-label="Sectors and themes">
          {sectors.map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={item.key === key}
              className={`chip${item.key === key ? " active" : ""}`}
              onClick={() => setKey(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {/* Keyed by sector so the rows rise in again each time the chip changes. */}
      <div className="bi-panel" key={key}>
        <div className="bi-head">
          <SectorMark sector={key} />
          <p className="bi-line">{sector.line}</p>
        </div>
        <div className="mf-allhead">
          <span>
            {inSector.length} {inSector.length === 1 ? "fund" : "funds"}
          </span>
          <ReturnSwitch basis={basis} onChange={setBasis} />
        </div>
        <ul className="row-list">
          {inSector.slice(0, 3).map((fund, index) => (
            <HomeFundRow key={fund.id} fund={fund} basis={basis} index={index} />
          ))}
        </ul>
        {inSector.length > 3 && (
          <button
            className="view-all"
            onClick={() => push({ name: "list", spec: { title: "Invest in a sector", theme: key } })}
          >
            View all {inSector.length} {sector.label} funds <Icon name="caret-right" size={16} />
          </button>
        )}
      </div>
    </Block>
  );
}

// 4. Collections. `grow` scales the picture inside its tile when the art is drawn small.
const collections: { art: string; label: string; grow?: number; spec: ListSpec }[] = [
  {
    art: "col-high-return.png",
    label: "High Return",
    spec: {
      title: "High return",
      caption: "Biggest 3-year gains, mostly from company shares. Past returns aren't a promise.",
    },
  },
  {
    art: "col-sip100.png",
    label: "SIP with ₹100",
    grow: 1.15,
    spec: {
      title: "SIP from ₹100",
      sipOnly: true,
      caption: "A SIP invests a set amount every month. Start at ₹100, stop any time.",
    },
  },
  {
    art: "col-small-cap.png",
    label: "Small Cap",
    spec: {
      title: "Small cap",
      cat: "small",
      caption: "Funds in smaller companies, outside India's 250 biggest. More ups and downs.",
    },
  },
  {
    art: "col-top-rated.png",
    label: "Top Rated",
    spec: {
      title: "Top rated",
      minStars: 5,
      caption: "5-star funds from Value Research, rated on past returns and risk.",
    },
  },
  {
    art: "col-gold-silver.png",
    label: "Gold & Silver",
    spec: {
      title: "Gold & Silver",
      cat: "gold",
      caption: "Invest in gold or silver without buying the metal. Prices follow the metal.",
    },
  },
];

function Collections() {
  const { push } = useMf();
  return (
    <Block title="Collections">
      <div className="mf-collections">
        {collections.map((item) => (
          <button key={item.label} onClick={() => push({ name: "list", spec: { ...item.spec, withExtras: true } })}>
            <i className="col-art">
              <img
                src={asset(item.art)}
                alt=""
                draggable={false}
                style={item.grow ? { transform: `scale(${item.grow})` } : undefined}
              />
            </i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </Block>
  );
}

// 5. All mutual funds
function AllFunds() {
  const { push } = useMf();
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const { basis, sort, setBasis, setSort } = useFundView();

  const list = sortFunds(nextFunds.filter((fund) => cat === "all" || fund.cat === cat), sort, basis);

  return (
    <Block title="All mutual funds">
      <FilterRow cat={cat} onCat={setCat} sort={sort} onSort={setSort} />
      <div className="bi-panel bi-panel-all">
        <div className="mf-allhead">
          <span>{cat === "all" ? `${compare.total} funds` : `${list.length} funds in this preview`}</span>
          <ReturnSwitch basis={basis} onChange={setBasis} />
        </div>
        <ul className="row-list">
          {list.slice(0, 5).map((fund) => (
            <HomeFundRow key={fund.id} fund={fund} basis={basis} />
          ))}
        </ul>
        <button
          className="view-all"
          onClick={() =>
            push({
              name: "list",
              spec: { title: "All mutual funds", cat: cat === "all" ? undefined : cat, withExtras: true },
            })
          }
        >
          View all {compare.total} funds <Icon name="caret-right" size={16} />
        </button>
      </div>
    </Block>
  );
}

// 6. Invest for a goal. Goals with art get a picture card (light and dark versions) and open on a poster;
// the last two stay plain colour cards.
type Goal = { title: string; line: string; spec: ListSpec };

const goals: Goal[] = [
  {
    title: "Become a crorepati",
    line: "See what to invest each month",
    spec: {
      title: "Become a crorepati",
      cats: ["index", "large", "flexi"],
      withExtras: true,
      bucket: {
        tone: "var(--surface-L2)",
        art: {
          eyebrow: "Become a crorepati",
          hero: { src: "goal-crore-dark.jpg", x: 0, y: -96, w: 422, h: 420 },
          card: {
            light: { src: "goal-crore-light.jpg", x: -72, y: -40, w: 281, h: 279 },
            dark: { src: "goal-crore-dark.jpg", x: -184, y: -127, w: 457, h: 456 },
          },
        },
        big: "₹1 crore",
        promise: "Put in a fixed amount every month and let it add up in the long run.",
        listTitle: "Pick a fund to start with",
        ladder: [
          { goal: "₹10 lakh", target: 1000000, years: 5 },
          { goal: "₹50 lakh", target: 5000000, years: 10 },
          { goal: "₹1 crore", target: 10000000, years: 12 },
        ],
      },
    },
  },
  {
    title: "Save tax",
    line: "The most you can save in a year",
    spec: {
      title: "Save tax",
      cat: "elss",
      withExtras: true,
      bucket: {
        tone: "color-mix(in srgb, var(--warning-subtle) 45%, var(--surface-L1))",
        art: {
          eyebrow: "Save tax up to",
          hero: { src: "goal-tax-hero.jpg", x: -177, y: -115, w: 679, h: 501 },
          card: {
            light: { src: "goal-tax-light.jpg", x: -12, y: -5, w: 192, h: 216, fit: [0.07, -3.4, 99.93, 106.8] },
            dark: { src: "goal-tax-dark.jpg", x: -56, y: -57, w: 257, h: 313 },
          },
        },
        big: "₹46,800",
        promise: "Invest up to ₹1.5 lakh in an ELSS fund and save up to ₹46,800 in tax a year.",
        note: "Old tax regime, 30% slab. Your units stay locked for 3 years.",
        listTitle: "ELSS tax saving funds",
        noListFacts: true,
      },
    },
  },
  {
    title: "Emergency fund",
    line: "of expenses, kept within reach",
    spec: {
      title: "Emergency fund",
      cats: ["liquid", "debt"],
      withExtras: true,
      bucket: {
        tone: "color-mix(in srgb, var(--positive-subtle) 45%, var(--surface-L1))",
        art: {
          eyebrow: "Emergency fund",
          copyWidth: 282,
          hero: { src: "goal-emergency-hero.jpg", x: -46, y: -77, w: 475, h: 350, fit: [0.03, 0.03, 99.94, 105.58] },
          card: {
            light: { src: "goal-emergency-light.jpg", x: -84, y: -41, w: 283, h: 272 },
            dark: { src: "goal-emergency-dark.jpg", x: -133, y: -85, w: 371, h: 356 },
          },
        },
        big: "6 months",
        promise: "A common rule: keep six months of expenses where you can get it back quickly.",
        listTitle: "Liquid and debt funds",
        noListFacts: true,
      },
    },
  },
  {
    title: "Grow with India",
    line: "India's biggest companies",
    spec: {
      title: "Grow with India",
      cat: "index",
      withExtras: true,
      bucket: {
        tone: "var(--surface-L2)",
        big: "50 in 1",
        promise: "One fund that holds India's 50 biggest listed companies. Low cost, and you own a bit of each.",
        listTitle: "Nifty 50 index funds",
      },
    },
  },
  {
    title: "Grow faster",
    line: "Bigger ups and downs, so give it time",
    spec: {
      title: "Grow faster",
      cats: ["small", "mid"],
      withExtras: true,
      bucket: {
        tone: "color-mix(in srgb, var(--accent-subtle) 30%, var(--surface-L1))",
        big: "7+ years",
        promise: "Smaller companies can grow faster, and fall harder. Give them time.",
        note: "Suits goals many years away.",
        listTitle: "Small and mid cap funds",
      },
    },
  },
];

function Goals() {
  const { push } = useMf();
  return (
    <Block title="Invest for a goal">
      <HScroll>
        {goals.map((goal) => {
          const bucket = goal.spec.bucket!;
          const art: GoalArtSpec | undefined = bucket.art;
          return (
            <button
              className={`dream-card${art ? " has-art" : ""}`}
              key={goal.title}
              style={art ? undefined : { background: bucket.tone }}
              aria-label={`${goal.title}. ${goal.line}`}
              onClick={() => push({ name: "list", spec: goal.spec })}
            >
              {art && (
                <>
                  <ArtBox art={art.card.light} className="dream-art light" />
                  <ArtBox art={art.card.dark} className="dream-art dark" />
                </>
              )}
              <span className="dream-kicker">{art?.eyebrow ?? goal.title}</span>
              <b className="dream-big">{bucket.big}</b>
              {!art && (
                <>
                  <small className="dream-line">{goal.line}</small>
                  <Icon name="caret-right" size={14} />
                </>
              )}
            </button>
          );
        })}
      </HScroll>
    </Block>
  );
}

// 7. Sign-off: "Mutual fund [mark] se". Once it scrolls into view the words rise in, the face appears and winks;
// tapping the mark plays it again. Reduced motion shows the finished line straight away.
const SIGNOFF_STEPS_MS = [60, 1250, 1850, 2450, 2850]; // words in, face on, wink, eye open, face off

function SignoffFace() {
  return (
    <svg className="so-face" viewBox="0 0 22 22" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.4" />
      <circle className="so-eye so-eye-l" cx="7.6" cy="9" r="1.35" fill="currentColor" />
      <path className="so-eye-closed" d="M5.9 9.4 Q7.6 7.4 9.3 9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14.4" cy="9" r="1.35" fill="currentColor" />
      <path d="M6.8 13 Q11.4 17.2 15.4 12.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Signoff() {
  const [plays, setPlays] = useState(0); // 0 = not seen yet; each tap on the mark adds one
  const [step, setStep] = useState(0); // how far the current play has got (0 to 5)
  const footer = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footer.current;
    if (!el) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlays((n) => n || 1);
          seen.disconnect();
        }
      },
      { threshold: 0.7 },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (!plays) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(5);
      return;
    }
    setStep(0);
    const timers = SIGNOFF_STEPS_MS.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, [plays]);

  const line = ["so-line", step >= 1 && "in", step >= 2 && step < 5 && "face", step === 3 && "wink"]
    .filter(Boolean)
    .join(" ");
  const mask = `url(${asset("37c13.svg")})`;

  return (
    <footer ref={footer} className={`mf-signoff${plays ? "" : " pre"}`}>
      <div className={line} role="img" aria-label="Mutual fund sahi se">
        <span className="so-w so-w1" aria-hidden="true">
          Mutual fund
        </span>
        <button className="so-mark" tabIndex={-1} aria-hidden="true" onClick={() => setPlays((n) => n + 1)}>
          <span style={{ WebkitMaskImage: mask, maskImage: mask }} />
        </button>
        <span className="so-tail" aria-hidden="true">
          <span className="so-w so-w3">se</span>
          <SignoffFace />
        </span>
      </div>
      <p className="mf-disclaimer">{MARKET_RISK}</p>
    </footer>
  );
}

// Banner (or alerts once the person holds funds), baskets, then the widgets and the sign-off.
export function MfHomeNext() {
  const { holdings } = useMf();
  return (
    <main className={`dashboard home-feed mf-home mf-home-next${holdings.length > 0 ? " on-sheet" : ""}`}>
      {holdings.length > 0 ? <Alerts /> : <Banner />}
      <BasketsSection />
      <TopPerforming />
      <Sectors />
      <Collections />
      <AllFunds />
      <Goals />
      <Signoff />
    </main>
  );
}
