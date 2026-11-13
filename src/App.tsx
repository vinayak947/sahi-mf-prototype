import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { asset } from "./assets";
import {
  CommoditiesHome,
  FnoHome,
  StocksHome,
} from "./screens/Home";
import {
  OrdersPage,
  PortfolioPage,
  TradePage,
  WatchlistPage,
  type Page,
} from "./screens/Pages";
import { NavLottie, type NavLottieName } from "./ui/NavLottie";
import { DevPanel } from "./mf/DevPanel";
import { MfFlow } from "./mf/MfFlow";
import { MfHome } from "./mf/MfHome";
import { SipPage } from "./mf/MfPages";
import { MfProvider, useMf } from "./mf/store";
import { deviceSize, scrollToTop, scroller, toDevice } from "./ui/device";

type Market = "fno" | "commodities" | "stocks" | "mf";
// open  : sheet is showing
// zoom  : sheet drops away, chosen icon zooms to the centre of the dark overlay
// hold  : icon + name sit in the centre
// prep  : dashboard chrome mounts so the tab's icon slot can be measured
// fly   : icon curves into the tab, overlay fades out
type OnboardingPhase = "open" | "zoom" | "hold" | "prep" | "fly" | "closed";
type TabRevealPhase = "hidden" | "selected" | "next" | "all";
type FlightTarget = { cx: number; cy: number; size: number };
type IconFlight = {
  market: Market;
  start: DOMRect;
  target?: FlightTarget;
};

// Keep FLY_MS in sync with --fly-ms in index.css.
const ZOOM_SCALE = 2.5;
const ZOOM_MS = 380;
const HOLD_MS = 1000;
const FLY_MS = 700;
const HERO_LABEL_GAP = 12;
// Tab icons sit tilted in the pill (see .tab-art in index.css).
const TAB_TILT = -6;

function getHero(start: DOMRect) {
  const size = start.width * ZOOM_SCALE;
  return {
    size,
    cx: deviceSize().width / 2,
    cy: deviceSize().height / 2 - 28,
  };
}

// The flight element transforms around its centre so scale and tilt stay put
// while it travels; all keyframes are expressed as centre offsets.
function getFlightStyle(flight: IconFlight): CSSProperties {
  return {
    left: flight.start.left,
    top: flight.start.top,
    width: flight.start.width,
    height: flight.start.height,
  };
}

function zoomKeyframes(start: DOMRect): Keyframe[] {
  const hero = getHero(start);
  const dx = hero.cx - (start.left + start.width / 2);
  const dy = hero.cy - (start.top + start.height / 2);
  return [
    { transform: "translate(0px, 0px) scale(1) rotate(0deg)" },
    { transform: `translate(${dx}px, ${dy}px) scale(${ZOOM_SCALE}) rotate(0deg)` },
  ];
}

// Cubic bezier from the centred icon up and out to the right, then sweeping
// back left into the tab. Sampled so the browser can run it on the compositor.
function flyKeyframes(start: DOMRect, target: FlightTarget): Keyframe[] {
  const hero = getHero(start);
  const { width: vw, height: vh } = deviceSize();
  const reach = Math.min(vw, 480);
  const startCx = start.left + start.width / 2;
  const startCy = start.top + start.height / 2;
  const targetScale = target.size / start.width;

  const p0 = { x: hero.cx, y: hero.cy };
  const p3 = { x: target.cx, y: target.cy };
  const p1 = {
    x: Math.min(Math.max(p0.x, p3.x) + reach * 0.4, vw - 30),
    y: p0.y - vh * 0.14,
  };
  const p2 = {
    x: Math.min(p3.x + reach * 0.4, vw - 30),
    y: p3.y + vh * 0.03,
  };

  const steps = 48;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    // ease-in-out along the curve
    const t = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
    const m = 1 - t;
    const x =
      m ** 3 * p0.x + 3 * m ** 2 * t * p1.x + 3 * m * t ** 2 * p2.x + t ** 3 * p3.x;
    const y =
      m ** 3 * p0.y + 3 * m ** 2 * t * p1.y + 3 * m * t ** 2 * p2.y + t ** 3 * p3.y;
    const scale = ZOOM_SCALE + (targetScale - ZOOM_SCALE) * t;
    return {
      offset: u,
      transform: `translate(${x - startCx}px, ${y - startCy}px) scale(${scale}) rotate(${TAB_TILT * t}deg)`,
    };
  });
}


const marketArt: Record<Market, string> = {
  fno: asset("ecf72.png"),
  commodities: asset("c2165.png"),
  stocks: asset("83578.png"),
  mf: asset("mutual-funds.png"),
};

const marketLabels: Record<Market, string> = {
  fno: "F&O",
  commodities: "Commodities",
  stocks: "Stocks",
  mf: "Mutual Funds",
};

const tabLabels: Record<Market, string> = marketLabels;

const marketOrder: Market[] = ["fno", "commodities", "stocks", "mf"];

// Tab widths in px (see .market-tabs in index.css). The selected tab takes its
// expanded width (icon room + label + padding) and the others sit at their
// label plus padding; the grid glides between the two. The row is wider than
// the screen on purpose: the last tab peeks past the edge and the row scrolls.
const tabWidths: Record<Market, { open: number; shut: number }> = {
  fno: { open: 97, shut: 54 },
  commodities: { open: 139, shut: 100 },
  stocks: { open: 102, shut: 72 },
  mf: { open: 131, shut: 104 },
};
const TAB_GAP = 8;

// The market picked on the start sheet leads; the rest follow in their usual order.
function orderFor(first: Market): Market[] {
  return [first, ...marketOrder.filter((candidate) => candidate !== first)];
}

const navItems: {
  page: Page;
  label: string;
  icon: string;
  // animated icon (outline -> filled when selected); Trade keeps its static icon
  lottie?: NavLottieName;
}[] = [
  { page: "home", label: "Home", icon: "c5d6b.svg" },
  { page: "watchlist", label: "Watchlist", icon: "2792a.svg", lottie: "watchlist" },
  { page: "trade", label: "Trade", icon: "bc8e8.svg" },
  { page: "orders", label: "Orders", icon: "33ec0.svg", lottie: "orders" },
  { page: "portfolio", label: "Portfolio", icon: "f7350.svg", lottie: "portfolio" },
];

// Mutual Funds has its own bar: the plant (MF home), then SIP, Orders, Portfolio.
const mfNavItems: typeof navItems = [
  { page: "home", label: "Home", icon: "c5d6b.svg" },
  { page: "sip", label: "SIP", icon: "c5d6b.svg" },
  { page: "orders", label: "Orders", icon: "33ec0.svg", lottie: "orders" },
  { page: "portfolio", label: "Portfolio", icon: "f7350.svg", lottie: "portfolio" },
];

function Header({
  market,
  onMarket,
  showMarketTabs,
  order,
  showSettings,
  onToggleSettings,
  tabRevealPhase,
  activeIconRef,
  hideActiveIcon,
  landedMarket,
  mfSeen,
}: {
  market: Market | null;
  onMarket: (market: Market) => void;
  showMarketTabs: boolean;
  order: Market[];
  showSettings: boolean;
  onToggleSettings: () => void;
  tabRevealPhase: TabRevealPhase;
  activeIconRef?: Ref<HTMLImageElement>;
  hideActiveIcon?: boolean;
  landedMarket: Market | null;
  mfSeen: boolean;
}) {
  const { push } = useMf();
  const tabsRef = useRef<HTMLElement>(null);
  // The row scrolls sideways; when the selected tab is not fully in view, bring it to the left edge.
  useEffect(() => {
    const el = tabsRef.current;
    if (!el || !market) return;
    const widthOf = (key: Market) => (key === market ? tabWidths[key].open : tabWidths[key].shut);
    let left = 0;
    for (const key of order) {
      if (key === market) break;
      left += widthOf(key) + TAB_GAP;
    }
    const padRight = parseFloat(getComputedStyle(el).paddingRight) || 0;
    const total = order.reduce((n, key) => n + widthOf(key), 0) + TAB_GAP * (order.length - 1);
    const max = Math.max(0, total + padRight - el.clientWidth);
    const visibleEnd = el.scrollLeft + el.clientWidth - padRight;
    if (left < el.scrollLeft || left + widthOf(market) > visibleEnd) {
      el.scrollTo({ left: Math.min(left, max), behavior: "smooth" });
    }
  }, [market, order]);
  // The logo row scrolls away; the category tabs dock to the top. They start
  // sticking once the page has scrolled past the header (88px) minus the
  // dock's 8px sticky offset, so that is when the docked styling switches on.
  // The profile button switches light / dark (the design-system tokens in tokens.css); remembered in this browser.
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("sahi-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked: the switch still works for this visit */
    }
  };
  const [devOpen, setDevOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const el = scroller();
    if (!el) return;
    const update = () => setDocked(el.scrollTop >= 80);
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  return (
    <>
    <header className={`app-header${market === "mf" ? " mf-top" : ""}`}>
      <div className="home-row">
        {/* Demo switch: tapping the logo shows / hides the settings button so
            both versions of the tab row can be compared. */}
        <button
          aria-label={`SAHI. ${showSettings ? "Hide" : "Show"} settings button`}
          aria-pressed={showSettings}
          className="brand-button"
          onClick={onToggleSettings}
        >
          <img className="brand-mark" src={asset("37c13.svg")} alt="" />
        </button>
        <div className="header-actions">
          <button aria-label="Search" onClick={() => market === "mf" && push({ name: "search" })}>
            <img src={asset("98e47.svg")} alt="" />
          </button>
          {/* Prototype: opens the dev environment switches. */}
          <button aria-label="Dev environment" onClick={() => setDevOpen(true)}>
            <img src={asset("4811d.svg")} alt="" />
          </button>
          <button aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark} onClick={toggleTheme}>
            <img src={asset("969ac.svg")} alt="" />
          </button>
        </div>
      </div>
    </header>
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
      {showMarketTabs && market !== null && (
        <div className={`market-dock${docked ? " docked" : ""}`}>
        <div className={`market-bar${showSettings ? "" : " no-gear"}`}>
        <nav
          ref={tabsRef}
          className="market-tabs"
          aria-label="Markets"
          style={{
            gridTemplateColumns: order
              .map((key) => `${market === key ? tabWidths[key].open : tabWidths[key].shut}px`)
              .join(" "),
          }}
        >
          {order.map((key) => {
            // reveal sequence: the picked tab, then the one beside it, then the last
            const nextMarket = order[1];
            const isRevealed =
              tabRevealPhase === "all" ||
              market === key ||
              (tabRevealPhase === "next" && nextMarket === key);

            return (
              <button
                aria-pressed={market === key}
                className={[
                  `tab-${key}`,
                  market === key ? "active" : "",
                  market === key && hideActiveIcon
                    ? "awaiting-flight"
                    : "",
                  isRevealed ? "tab-revealed" : "tab-hidden",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isRevealed}
                key={key}
                onClick={() => onMarket(key)}
              >
                <span className="tab-label">
                  {market === key && (
                    <span
                      className={[
                        "tab-art",
                        `tab-art-${key}`,
                        hideActiveIcon
                          ? "flight-target-hidden"
                          : landedMarket === key
                            ? "flight-target-landed"
                            : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    >
                      <img
                        className="tab-art-icon"
                        ref={activeIconRef}
                        src={marketArt[key]}
                        alt=""
                      />
                    </span>
                  )}
                  <span className="tab-text">{tabLabels[key]}</span>
                  {key === "mf" && market !== "mf" && !mfSeen && isRevealed && (
                    <i className="tab-new">New</i>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
          <button
            aria-label="Settings"
            className={[
              "tab-settings",
              tabRevealPhase === "all" ? "tab-revealed" : "tab-hidden",
              showSettings ? "" : "settings-off",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={tabRevealPhase !== "all" || !showSettings}
            tabIndex={showSettings ? undefined : -1}
          >
            <img src={asset("gear.svg")} alt="" />
          </button>
        </div>
        </div>
      )}
    </>
  );
}

// Static line icon for Mutual Funds in the bottom bar: a sprout, drawn on the
// same 24px grid and stroke weight as the Lottie icons beside it (outline when
// idle, filled leaves when selected).
function PlantIcon({ filled }: { filled: boolean }) {
  // Paths from Figma "plant-01" (The New Home - SAHI, node 1585:103807 selected / 1585:103814 idle), 24px grid.
  const ink = "var(--text-primary)";
  return (
    <svg className="nav-mf" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      {filled ? (
        <>
          <path d="M14.6 13.5C12.6 16 12 17.2 12 21" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M9.6 11C7.99 12.21 5.44 12.26 3.98 10.8C1.55 8.37 2.04 3.04 2.04 3.04C2.04 3.04 7.37 2.55 9.8 4.98C11.26 6.44 11.31 8.89 10.1 10.5L6.6 6.5C6.1 6 5.76 6.15 5.46 6.44C5.15 6.73 5.31 7.19 5.6 7.5L9.6 11Z"
            fill={ink}
            stroke={ink}
            strokeWidth="0.5"
            strokeLinecap="round"
          />
          <path
            d="M14.6 13C13.28 11.56 13.68 9.15 15.07 7.76C17.23 5.6 21.96 6.04 21.96 6.04C21.96 6.04 22.4 10.77 20.24 12.93C18.91 14.26 16.5 14.67 15.07 13.5L18.6 10.5C18.92 10.23 18.91 9.78 18.64 9.46C18.45 9.24 17.92 9.19 17.6 9.46L14.6 13Z"
            fill={ink}
            stroke={ink}
            strokeWidth="0.5"
            strokeLinecap="round"
          />
          <path d="M10.1 11C11.65 13.55 12 17.35 12 21" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <g stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10C18 10 12 14 12 21" />
          <path d="M9.35 11.18C7.74 12.39 5.44 12.26 3.98 10.8C1.55 8.37 2.04 3.04 2.04 3.04C2.04 3.04 7.37 2.55 9.8 4.98C10.75 5.94 11.14 7.25 10.95 8.5" />
          <path d="M14.96 12.82C13.64 11.38 13.68 9.15 15.07 7.76C17.23 5.6 21.96 6.04 21.96 6.04C21.96 6.04 22.4 10.77 20.24 12.93C19.49 13.68 18.49 14.04 17.5 14" />
          <path d="M6 7C6 7 12 12 12 21" />
        </g>
      )}
    </svg>
  );
}

// SIP tab icon: a calendar on the same grid (outline idle, filled selected).
function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="nav-mf"
      viewBox="2 2 20 20"
      width="24"
      height="24"
      fill="none"
      stroke="var(--text-primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill={filled ? "var(--text-primary)" : "none"} />
      <path d="M3.5 10h17" stroke={filled ? "var(--text-inverse)" : "var(--text-primary)"} />
      <path d="M8 2.8V6.6M16 2.8V6.6" />
      {filled ? null : <path d="M8 14h2M14 14h2M8 17h2" strokeWidth="1.4" />}
    </svg>
  );
}

function BottomNav({
  market,
  page,
  onPage,
}: {
  market: Market;
  page: Page;
  onPage: (page: Page) => void;
}) {
  const visibleItems = market === "mf" ? mfNavItems : navItems;

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary navigation"
      style={{ gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)` }}
    >
      {visibleItems.map((item) => {
        const selected = item.page === page;
        // Home's icon follows the market you are in
        const lottie = item.page === "home" ? (market === "mf" ? undefined : market) : item.lottie;

        return (
          <button
            aria-current={selected ? "page" : undefined}
            className={selected ? "selected" : ""}
            key={item.page}
            onClick={() => onPage(item.page)}
          >
            <span
              className={
                item.page === "trade"
                  ? "bottom-nav-icon trade-icon"
                  : "bottom-nav-icon"
              }
            >
              {item.page === "home" && market === "mf" ? (
                <PlantIcon filled={selected} />
              ) : item.page === "sip" ? (
                <CalendarIcon filled={selected} />
              ) : lottie ? (
                <NavLottie name={lottie as NavLottieName} selected={selected} />
              ) : (
                <img src={asset(item.icon)} alt="" />
              )}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
      <span className="sr-only">Current market: {marketLabels[market]}</span>
    </nav>
  );
}

function StartSheet({
  phase,
  selectedMarket,
  onClose,
  onChoose,
}: {
  phase: Exclude<OnboardingPhase, "closed">;
  selectedMarket: Market | null;
  onClose: () => void;
  onChoose: (market: Market, start: DOMRect) => void;
}) {
  const isClosing = phase !== "open";
  const isFading = phase === "prep" || phase === "fly";

  return (
    <div
      className={`start-backdrop${isClosing ? " dim" : ""}${isFading ? " fading" : ""}`}
      role="presentation"
    >
      <section
        className={`start-sheet${isClosing ? " closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-title"
      >
        <button className="close-sheet" onClick={onClose} aria-label="Close">
          <img src={asset("fba8a.svg")} alt="" />
        </button>
        <h1 id="start-title">
          Where would you like
          <br />
          to start?
        </h1>
        <div className="start-options">
          {(["fno", "commodities", "stocks", "mf"] as Market[]).map((market) => (
            <button
              className={
                isClosing
                  ? market === selectedMarket
                    ? "option-selected"
                    : "option-dismissed"
                  : ""
              }
              key={market}
              onClick={(event) => {
                const image = event.currentTarget.querySelector("img");
                if (image) onChoose(market, toDevice(image.getBoundingClientRect()));
              }}
            >
              <span>
                <img src={marketArt[market]} alt="" />
              </span>
              {marketLabels[market]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  return (
    <MfProvider
      onOpenPage={(next) => {
        setPage(next);
        scrollToTop();
      }}
    >
      <Shell page={page} setPage={setPage} />
    </MfProvider>
  );
}

function Shell({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const { stack, markSeen, mfSeen } = useMf();
  const [market, setMarket] = useState<Market | null>(null);
  const [tabOrder, setTabOrder] = useState<Market[]>(marketOrder);
  const [showSettings, setShowSettings] = useState(false);
  const [onboardingPhase, setOnboardingPhase] =
    useState<OnboardingPhase>("open");
  const [tabRevealPhase, setTabRevealPhase] =
    useState<TabRevealPhase>("hidden");
  const [iconFlight, setIconFlight] = useState<IconFlight | null>(null);
  const [landedMarket, setLandedMarket] = useState<Market | null>(null);
  const activeIconRef = useRef<HTMLImageElement>(null);
  const flightRef = useRef<HTMLImageElement>(null);

  // zoom: icon travels from its tile to the centre at ZOOM_SCALE.
  useEffect(() => {
    if (onboardingPhase !== "zoom" || !iconFlight || !flightRef.current) return;

    let cancelled = false;
    const animation = flightRef.current.animate(zoomKeyframes(iconFlight.start), {
      duration: ZOOM_MS,
      // slight overshoot, like Netflix's profile pick
      easing: "cubic-bezier(0.22, 1.2, 0.36, 1)",
      fill: "forwards",
    });
    animation.finished
      .then(() => {
        if (!cancelled) setOnboardingPhase("hold");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (animation.playState !== "finished") animation.cancel();
    };
  }, [onboardingPhase, iconFlight]);

  // hold: let the icon and name sit in the centre for a beat.
  useEffect(() => {
    if (onboardingPhase !== "hold") return;

    const timer = window.setTimeout(() => setOnboardingPhase("prep"), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [onboardingPhase]);

  // prep: dashboard chrome is now mounted; measure the tab's icon slot, then fly.
  useLayoutEffect(() => {
    if (
      onboardingPhase !== "prep" ||
      !iconFlight ||
      iconFlight.target ||
      !activeIconRef.current
    ) {
      return;
    }

    // Bounding rect gives the tilted centre; offsetWidth is the untilted size.
    const rect = toDevice(activeIconRef.current.getBoundingClientRect());
    const target: FlightTarget = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      size: activeIconRef.current.offsetWidth,
    };
    setIconFlight((current) => (current ? { ...current, target } : null));
    setOnboardingPhase("fly");
  }, [onboardingPhase, iconFlight]);

  // fly: curve into the tab, then hand over to the real tab icon.
  useEffect(() => {
    if (
      onboardingPhase !== "fly" ||
      !iconFlight?.target ||
      !flightRef.current
    ) {
      return;
    }

    let cancelled = false;
    const landing = iconFlight.market;
    const animation = flightRef.current.animate(
      flyKeyframes(iconFlight.start, iconFlight.target),
      { duration: FLY_MS, easing: "linear", fill: "forwards" },
    );
    animation.finished
      .then(() => {
        if (cancelled) return;
        setLandedMarket(landing);
        setIconFlight(null);
        setOnboardingPhase("closed");
        setTabRevealPhase("selected");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (animation.playState !== "finished") animation.cancel();
    };
  }, [onboardingPhase, iconFlight]);

  useEffect(() => {
    if (
      tabRevealPhase !== "selected" &&
      tabRevealPhase !== "next"
    ) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTabRevealPhase("all");
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setTabRevealPhase(tabRevealPhase === "selected" ? "next" : "all");
    }, tabRevealPhase === "selected" ? 220 : 160);

    return () => window.clearTimeout(revealTimer);
  }, [tabRevealPhase]);

  function beginMarketSelection(nextMarket: Market, start: DOMRect) {
    if (onboardingPhase !== "open") {
      return;
    }

    setMarket(nextMarket);
    setTabOrder(orderFor(nextMarket));
    setLandedMarket(null);
    if (nextMarket === "mf") markSeen();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOnboardingPhase("closed");
      setTabRevealPhase("all");
      return;
    }

    setIconFlight({ market: nextMarket, start });
    setOnboardingPhase("zoom");
  }

  function dismissOnboarding() {
    if (onboardingPhase !== "open") {
      return;
    }

    setMarket("fno");
    setTabOrder(orderFor("fno"));
    setLandedMarket(null);
    setOnboardingPhase("closed");
    setTabRevealPhase("all");
  }

  const chromeMounted =
    onboardingPhase === "prep" ||
    onboardingPhase === "fly" ||
    onboardingPhase === "closed";
  const heroLeaving = onboardingPhase === "prep" || onboardingPhase === "fly";
  const hero = iconFlight ? getHero(iconFlight.start) : null;

  useEffect(() => {
    // The phone stops scrolling under a flow (.flow-open .device-scroll). iOS Safari tints the status bar from the page under the flow, so drop the pink while one is open.
    document.documentElement.classList.toggle("flow-open", stack.length > 0);
    return () => {
      document.documentElement.classList.remove("flow-open");
    };
  }, [stack.length]);

  function goToPage(nextPage: Page) {
    setPage(nextPage);
    scrollToTop();
  }

  return (
    <div
      className={`app-shell${
        onboardingPhase === "prep" || onboardingPhase === "fly"
          ? " is-transitioning"
          : ""
      }${page === "home" ? "" : " page-plain"}`}
    >
      {page === "home" && (
        <Header
          market={market}
          onMarket={(nextMarket) => {
            setLandedMarket(null);
            setMarket(nextMarket);
            if (nextMarket === "mf") markSeen();
          }}
          mfSeen={mfSeen}
          showMarketTabs={chromeMounted && market !== null}
          order={tabOrder}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings((current) => !current)}
          tabRevealPhase={tabRevealPhase}
          activeIconRef={activeIconRef}
          hideActiveIcon={iconFlight !== null}
          landedMarket={landedMarket}
        />
      )}
      {chromeMounted && market !== null && (
        <>
          {page === "home" && market === "fno" && <FnoHome />}
          {page === "home" && market === "commodities" && <CommoditiesHome />}
          {page === "home" && market === "stocks" && <StocksHome />}
          {page === "home" && market === "mf" && <MfHome />}
          {page === "watchlist" && <WatchlistPage />}
          {page === "trade" && <TradePage />}
          {page === "orders" && <OrdersPage mfOnly={market === "mf"} />}
          {page === "portfolio" && <PortfolioPage mfOnly={market === "mf"} />}
          {page === "sip" && <SipPage />}
          <BottomNav market={market} page={page} onPage={goToPage} />
          <MfFlow />
        </>
      )}
      {onboardingPhase !== "closed" && (
        <StartSheet
          phase={onboardingPhase}
          selectedMarket={market}
          onClose={dismissOnboarding}
          onChoose={beginMarketSelection}
        />
      )}
      {iconFlight && hero && (
        <>
          <img
            ref={flightRef}
            className="flight-icon"
            src={marketArt[iconFlight.market]}
            alt=""
            aria-hidden="true"
            style={getFlightStyle(iconFlight)}
          />
          <div
            className={`hero-label${heroLeaving ? " leaving" : ""}`}
            style={{ top: hero.cy + hero.size / 2 + HERO_LABEL_GAP }}
            aria-hidden="true"
          >
            {marketLabels[iconFlight.market]}
          </div>
        </>
      )}
    </div>
  );
}
