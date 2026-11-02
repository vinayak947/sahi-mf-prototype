import { useState, type ReactNode } from "react";
import { asset } from "../assets";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import { compare, funds, fundById, type CategoryKey, type Fund } from "./data";
import { fmtDay, inr, nextSipDate, pct } from "./format";
import { FilterRow, FundMark, fundCategory, ReturnSwitch, sortFunds, Stars, RowSide, useFundView } from "./parts";
import { useMf, type ListSpec } from "./store";

// 1. Banner to start investing
function Banner() {
  const { push } = useMf();
  return (
    <div className="mf-intro">
      <div>
        <h2>Start investing with as little as ₹100</h2>
        <p>₹0 commission, Withdraw anytime</p>
        <button
          onClick={() =>
            push({
              name: "list",
              spec: { title: "SIP from ₹100", sipOnly: true, caption: "Funds you can start with ₹100 a month. Stop anytime." },
            })
          }
        >
          Start a SIP
        </button>
      </div>
      <img src={asset("mutual-funds.png")} alt="" />
    </div>
  );
}

// 2. Top Performing Funds
function TopPerforming() {
  const { push } = useMf();
  const list = funds
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
              spec: { title: "Top performing funds", equityOnly: true, caption: "Equity funds, highest 3-year return first." },
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

// 3. What do you want your money to do? Goals in the person's own words. Each card reads
// "goal / number / what it means" and opens a rule over funds we already list.
const dreams: { title: string; line: string; spec: ListSpec }[] = [
  {
    title: "Become a crorepati",
    line: "See what to invest each month",
    spec: {
      title: "Become a crorepati",
      cats: ["index", "large", "flexi"],
      bucket: {
        tone: "var(--surface-L2)",
        big: "₹1 crore",
        promise: "Put in a fixed amount every month and let it add up. Here is what it takes.",
        listTitle: "Equity funds for the long run",
        ladder: [
          { goal: "₹1 lakh", target: 100000, years: 3 },
          { goal: "₹10 lakh", target: 1000000, years: 7 },
          { goal: "₹1 crore", target: 10000000, years: 20 },
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
      bucket: {
        tone: "color-mix(in srgb, var(--warning-subtle) 45%, var(--surface-L1))",
        big: "₹46,800",
        promise: "Invest up to ₹1.5 lakh in an ELSS fund and save up to ₹46,800 in tax a year.",
        note: "Old tax regime, 30% slab. Your units stay locked for 3 years.",
        listTitle: "ELSS tax saving funds",
      },
    },
  },
  {
    title: "Emergency fund",
    line: "of expenses, kept within reach",
    spec: {
      title: "Emergency fund",
      cats: ["liquid", "debt"],
      bucket: {
        tone: "color-mix(in srgb, var(--positive-subtle) 45%, var(--surface-L1))",
        big: "6 months",
        promise: "A common rule: keep six months of expenses where you can get it back quickly.",
        note: "Liquid funds usually pay out by the next working day. Calmer, not risk-free.",
        listTitle: "Liquid and debt funds",
      },
    },
  },
  {
    title: "Grow with India",
    line: "India's biggest companies",
    spec: {
      title: "Grow with India",
      cat: "index",
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

function Dreams() {
  const { push } = useMf();
  return (
    <Block title="What do you want your money to do?">
      <HScroll>
        {dreams.map((dream) => (
          <button
            className="dream-card"
            key={dream.title}
            style={{ background: dream.spec.bucket!.tone }}
            onClick={() => push({ name: "list", spec: dream.spec })}
          >
            <span className="dream-kicker">{dream.title}</span>
            <b className="dream-big">{dream.spec.bucket!.big}</b>
            <small className="dream-line">{dream.line}</small>
            <Icon name="caret-right" size={14} />
          </button>
        ))}
      </HScroll>
    </Block>
  );
}

// 4. Collections
const collections: { art: string; label: string; spec: ListSpec }[] = [
  {
    art: "col-high-return.png",
    label: "High Return",
    spec: { title: "High return", caption: "Highest 3-year return first." },
  },
  {
    art: "col-sip100.png",
    label: "SIP with ₹100",
    spec: { title: "SIP from ₹100", sipOnly: true, caption: "Funds you can start with ₹100 a month. Stop anytime." },
  },
  {
    art: "col-small-cap.png",
    label: "Small Cap",
    spec: { title: "Small cap", cat: "small", caption: "Funds that invest in smaller companies." },
  },
  {
    art: "col-top-rated.png",
    label: "Top Rated",
    spec: { title: "Top rated", minStars: 5, caption: "5-star funds on Value Research." },
  },
  {
    art: "col-gold-silver.png",
    label: "Gold & Silver",
    spec: { title: "Gold & Silver", cat: "gold", caption: "Funds that follow the price of gold and silver." },
  },
];

function Collections() {
  const { push } = useMf();
  return (
    <Block title="Collections">
      <div className="mf-collections">
        {collections.map((item) => (
          <button key={item.label} onClick={() => push({ name: "list", spec: item.spec })}>
            <i className="col-art"><img src={asset(item.art)} alt="" draggable={false} /></i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </Block>
  );
}

// 4. All mutual funds
function AllFunds() {
  const { push } = useMf();
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const { basis, sort, setBasis, setSort } = useFundView();

  const list = sortFunds(funds.filter((fund) => (cat === "all" ? true : fund.cat === cat)), sort, basis);
  const shown = list.slice(0, 4);

  return (
    <Block title="All mutual funds">
      <FilterRow cat={cat} onCat={setCat} sort={sort} onSort={setSort} />

      <div className="mf-allhead">
        <span>{cat === "all" ? `${compare.total} funds` : `${list.length} funds in this preview`}</span>
        <ReturnSwitch basis={basis} onChange={setBasis} />
      </div>

      <ul className="row-list">
        {shown.map((fund) => (
          <li key={fund.id}>
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
        ))}
      </ul>
      <button
        className="view-all"
        onClick={() =>
          push({
            name: "list",
            spec: { title: "All mutual funds", cat: cat === "all" ? undefined : cat },
          })
        }
      >
        View all {compare.total} funds <Icon name="caret-right" size={16} />
      </button>
    </Block>
  );
}

// Not rendered at the moment, kept so it can come back.
function HowSip() {
  return (
    <Block title="How SIP works">
      <ol className="mf-how">
        <li>
          <i>1</i>
          <span>
            <b>Pick a fund and an amount</b>
            <small>As little as ₹100 a month.</small>
          </span>
        </li>
        <li>
          <i>2</i>
          <span>
            <b>Approve AutoPay once</b>
            <small>Your bank debits it on the date you choose.</small>
          </span>
        </li>
        <li>
          <i>3</i>
          <span>
            <b>It buys units every month</b>
            <small>Pause or cancel anytime. No lock-in on most funds.</small>
          </span>
        </li>
      </ol>
    </Block>
  );
}

// Things that need the person's attention, shown above the feed once they hold funds:
// a SIP instalment that didn't go through, and SIPs debiting in the next week.
// Nothing to say, nothing shown. Holdings live on Portfolio.
function Alerts() {
  const { push, sips, orders } = useMf();
  const missed = orders.filter((o) => o.kind === "SIP" && o.status === "failed");
  const today = new Date();
  const dueSoon = sips
    .map((s) => ({ ...s, next: nextSipDate(s.day, today) }))
    .filter((s) => (s.next.getTime() - today.getTime()) / 864e5 <= 7)
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  if (missed.length === 0 && dueSoon.length === 0) return null;

  const cards = [
    ...missed.map((o) => {
      const fund = fundById(o.fundId);
      return (
        <div key={o.id} role="listitem" className="mf-alert bad">
          <Icon name="warning-circle" size={20} />
          <span className="mf-alert-main">
            <b>Missed SIP · {fund.name}</b>
            <small>
              Your {inr(o.amount)} instalment on {o.navDate} didn&rsquo;t go through. Not enough balance in the bank.
            </small>
            <span className="mf-alert-actions">
              {/* Paid as a one-time buy, so the fund's one-time minimum applies (SBI Large Cap: ₹1,000). */}
              {!fund.buy && (
                <button
                  className="mf-btn solid sm"
                  onClick={() =>
                    push({ name: "amount", fundId: o.fundId, mode: "lump", preset: Math.max(o.amount, fund.minAdd) })
                  }
                >
                  Invest {inr(Math.max(o.amount, fund.minAdd))} now
                </button>
              )}
              <button className="text-link" onClick={() => push({ name: "orderdetail", orderId: o.id })}>
                Details
              </button>
            </span>
          </span>
        </div>
      );
    }),
    ...dueSoon.map((s) => {
      const fund = fundById(s.fundId);
      return (
        <div key={s.fundId} role="listitem">
          <button className="mf-alert" onClick={() => push({ name: "sipdetail", fundId: s.fundId })}>
            <Icon name="calendar" size={20} />
            <span className="mf-alert-main">
              <b>
                SIP on {fmtDay(s.next)} · {inr(s.amount)}
              </b>
              <small>{fund.name}. Keep the money in your bank so it goes through.</small>
            </span>
            <Icon name="caret-right" size={16} />
          </button>
        </div>
      );
    }),
  ];

  return (
    <Block title="Needs your attention">
      {cards.length > 1 ? <AlertCarousel cards={cards} /> : <div className="mf-alerts" role="list">{cards}</div>}
    </Block>
  );
}

// Two or more alerts: one card at a time, swiped sideways, with the next one peeking in.
function AlertCarousel({ cards }: { cards: ReactNode[] }) {
  const [at, setAt] = useState(0);
  return (
    <>
      <HScroll
        className="mf-alerts carousel"
        role="list"
        onScroll={(el) => {
          const card = el.firstElementChild as HTMLElement | null;
          if (card) setAt(Math.round(el.scrollLeft / (card.offsetWidth + 8)));
        }}
      >
        {cards}
      </HScroll>
      <div className="mf-alert-dots" aria-hidden="true">
        {cards.map((_, i) => (
          <i key={i} className={i === at ? "on" : undefined} />
        ))}
      </div>
    </>
  );
}

// One home for every user, except the top: someone who holds funds sees alerts (if any)
// instead of the "start investing" banner. ("How SIP works" (HowSip) and the SEBI line are off the
// home for now.)
export function MfHome() {
  const { holdings } = useMf();
  return (
    <main className="dashboard home-feed mf-home">
      {holdings.length > 0 ? <Alerts /> : <Banner />}
      <TopPerforming />
      <Collections />
      <AllFunds />
      <Dreams />
    </main>
  );
}
