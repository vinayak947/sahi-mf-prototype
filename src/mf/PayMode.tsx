import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { asset } from "../assets";
import { inr } from "./format";
import { Notice, ProtoLink, Row, Screen, Spinner } from "./parts";
import { useMf } from "./store";
import {
  BANKS,
  FEATURED_UPI,
  IFSC_RE,
  NET_BANKING_MIN,
  PROFILE_NAME,
  UPI_APPS,
  VPA_RE,
  accountLabel,
  bankFromIfsc,
  maskName,
  nameOnAccount,
  namesMatch,
  upiApp,
  type Account,
  type PayMethod,
  type UpiApp,
} from "./payData";

// "Select a payment mode", "Select UPI app", "Add bank account" and their sheets,
// lifted from the payment-method prototype (payment-method.apk). Opened from the
// "Pay with" row on the one-time order pad.

// ---- Paying ------------------------------------------------------------------------

// The inline "Invest" buttons pay straight away with the method they sit under:
// off to the UPI app (or bank), then back for the status check (Checkout.tsx).
function usePayNow(fundId: string, amount: number, back: "paymode" | "upiapps") {
  const { push, setPayMethod, isVerified } = useMf();

  // An account not yet shown to be in the investor's name is checked first (no third-party payments).
  function pay(method: PayMethod, fail = false) {
    if (method.kind !== "id" && !isVerified(method.account)) {
      push({ name: "verifybank", fundId, amount, method });
      return;
    }
    setPayMethod(method);
    push({ name: "checkout", fundId, amount, fail, back: { name: back, fundId, amount } });
  }

  return { pay };
}

const investLabel = (amount: number) => `Invest ${inr(amount, amount % 1 ? 2 : 0)}`;

// ---- Bits ----------------------------------------------------------------------------

function Logo({ src, filled, size = 40 }: { src: string; filled?: boolean; size?: number }) {
  return (
    <span className={`pm-logo${filled ? " filled" : ""}`} style={{ width: size, height: size }}>
      <img src={asset(src)} alt="" />
    </span>
  );
}

function PlusMark() {
  return (
    <span className="pm-logo plus">
      <Icon name="plus" size={20} />
    </span>
  );
}

// Bottom sheet with its own footer (the shared Sheet only has a "Got it" button).
function PaySheet({
  label,
  onClose,
  children,
  foot,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  foot: (close: (then?: () => void) => void) => ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const after = useRef<(() => void) | undefined>(undefined);
  const close = (then?: () => void) => {
    after.current = then;
    setClosing(true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className={`mf-sheet-layer${closing ? " closing" : ""}`}>
      <button className="mf-sheet-scrim" aria-label="Close" onClick={() => close()} />
      <div
        className="mf-sheet pm-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onAnimationEnd={(e) => {
          if (!closing || e.target !== e.currentTarget) return;
          onClose();
          after.current?.();
        }}
      >
        <div className="pm-sheet-body">{children}</div>
        <div className="mf-sheet-foot">{foot(close)}</div>
      </div>
    </div>
  );
}

// ---- UPI app rows ----------------------------------------------------------------------

// A radio row; the picked one opens to show the bank it pays from and an Invest button.
function UpiRows({
  apps,
  amount,
  picked,
  accounts,
  onPick,
  onChangeBank,
  onInvest,
  children,
}: {
  apps: UpiApp[];
  amount: number;
  picked: string | null;
  accounts: Record<string, Account>;
  onPick: (id: string) => void;
  onChangeBank: (app: UpiApp) => void;
  onInvest: (app: UpiApp) => void;
  children?: ReactNode;
}) {
  const { isVerified } = useMf();
  return (
    <div className="pm-card" role="radiogroup">
      {apps.map((app) => {
        const on = picked === app.id;
        const account = accounts[app.id] ?? app.accounts[0];
        return (
          <div key={app.id} className={`pm-row-wrap${on ? " on" : ""}`}>
            <button className="pm-row" role="radio" aria-checked={on} onClick={() => onPick(app.id)}>
              <Logo src={app.logo} filled={app.filled} />
              <b>{app.name}</b>
              <span className="pm-radio" />
            </button>
            <div className="pm-expand" inert={!on}>
              <div>
                <button className="pm-pill" onClick={() => onChangeBank(app)}>
                  <img src={asset(BANKS[account.bank].logo)} alt="" />
                  <span>{accountLabel(account)}</span>
                  {isVerified(account) ? (
                    <i className="pm-check ok" aria-label="Verified, in your name">
                      <Icon name="check-circle" size={14} />
                    </i>
                  ) : (
                    <i className="pm-check">Not verified</i>
                  )}
                  {app.accounts.length > 1 && (
                    <em>
                      Change <Icon name="chevron-right" size={14} />
                    </em>
                  )}
                </button>
                <button className="mf-btn solid wide" onClick={() => onInvest(app)}>
                  {isVerified(account) ? investLabel(amount) : "Verify account and invest"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {children}
    </div>
  );
}

function AddUpiRow({ onClick }: { onClick: () => void }) {
  return (
    <button className="pm-row" onClick={onClick}>
      <PlusMark />
      <b>Add UPI ID</b>
      <Icon name="chevron-right" size={16} />
    </button>
  );
}

// Shared state and sheets for the two UPI lists.
function useUpiPicker(fundId: string, amount: number, back: "paymode" | "upiapps") {
  const { payMethod } = useMf();
  const { pay } = usePayNow(fundId, amount, back);
  const [picked, setPicked] = useState<string | null>(payMethod.kind === "upi" ? payMethod.app : null);
  const [accounts, setAccounts] = useState<Record<string, Account>>(
    payMethod.kind === "upi" ? { [payMethod.app]: payMethod.account } : {},
  );
  const [bankSheet, setBankSheet] = useState<UpiApp | null>(null);
  const [idSheet, setIdSheet] = useState(false);

  const accountFor = (app: UpiApp) => accounts[app.id] ?? app.accounts[0];

  const rows = (apps: UpiApp[], extra?: ReactNode) => (
    <UpiRows
      apps={apps}
      amount={amount}
      picked={picked}
      accounts={accounts}
      onPick={setPicked}
      onChangeBank={(app) => app.accounts.length > 1 && setBankSheet(app)}
      onInvest={(app) => pay({ kind: "upi", app: app.id, account: accountFor(app) })}
    >
      {extra}
    </UpiRows>
  );

  const sheets = (
    <>
      {bankSheet && (
        <AccountSheet
          app={bankSheet}
          current={accountFor(bankSheet)}
          onPick={(account) => setAccounts((a) => ({ ...a, [bankSheet.id]: account }))}
          onClose={() => setBankSheet(null)}
        />
      )}
      {idSheet && (
        <AddUpiSheet amount={amount} onPay={(vpa) => pay({ kind: "id", vpa })} onClose={() => setIdSheet(false)} />
      )}
    </>
  );

  const failLink = (
    <ProtoLink
      onClick={() => {
        const app = upiApp(picked ?? "gpay");
        pay({ kind: "upi", app: app.id, account: accountFor(app) }, true);
      }}
    >
      simulate a failed payment
    </ProtoLink>
  );

  return { rows, sheets, failLink, openIdSheet: () => setIdSheet(true), pay };
}

// ---- Select a payment mode ----------------------------------------------------------------

export function PayModeScreen({ fundId, amount }: { fundId: string; amount: number }) {
  const { pop, push, verifiedBanks } = useMf();
  const upi = useUpiPicker(fundId, amount, "paymode");

  const netOpen = amount >= NET_BANKING_MIN;
  // Net banking only from the investor's own verified accounts.
  const banks = verifiedBanks;

  return (
    <Screen onBack={pop} plainBack className="pm">
      <h2 className="pm-title">Select a payment mode</h2>

      <div className="pm-section">
        <h3>UPI</h3>
        <button className="pm-link" onClick={() => push({ name: "upiapps", fundId, amount })}>
          View all <Icon name="chevron-right" size={14} />
        </button>
      </div>
      {upi.rows(FEATURED_UPI, <AddUpiRow onClick={upi.openIdSheet} />)}

      <div className="pm-section">
        <h3>Net Banking</h3>
      </div>
      {netOpen ? (
        <div className="pm-card">
          {banks.map((account) => (
            <button
              key={`${account.bank}-${account.last4}`}
              className="pm-row"
              onClick={() => upi.pay({ kind: "net", account })}
            >
              <Logo src={BANKS[account.bank].logo} />
              <b>{accountLabel(account)}</b>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
          <button className="pm-row" onClick={() => push({ name: "addbank", fundId, amount })}>
            <PlusMark />
            <b>Add bank account</b>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      ) : (
        <div className="pm-card pm-note">Use Net Banking for {inr(NET_BANKING_MIN)}+ transactions</div>
      )}

      {upi.failLink}
      {upi.sheets}
    </Screen>
  );
}

// ---- View all: Select UPI app ----------------------------------------------------------------

export function UpiAppsScreen({ fundId, amount }: { fundId: string; amount: number }) {
  const { pop } = useMf();
  const upi = useUpiPicker(fundId, amount, "upiapps");

  return (
    <Screen onBack={pop} plainBack className="pm">
      <h2 className="pm-title">Select UPI app</h2>
      <div className="pm-card">
        <AddUpiRow onClick={upi.openIdSheet} />
      </div>
      <div className="pm-gap" />
      {upi.rows(UPI_APPS)}
      {upi.failLink}
      {upi.sheets}
    </Screen>
  );
}

// ---- Sheets --------------------------------------------------------------------------------------

function AccountSheet({
  app,
  current,
  onPick,
  onClose,
}: {
  app: UpiApp;
  current: Account;
  onPick: (account: Account) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState(current);
  return (
    <PaySheet
      label={app.name}
      onClose={onClose}
      foot={(close) => (
        <button className="mf-btn solid wide" onClick={() => close(() => onPick(choice))}>
          Continue
        </button>
      )}
    >
      <Logo src={app.logo} filled={app.filled} size={56} />
      <h2>{app.name}</h2>
      <div className="pm-accounts" role="radiogroup">
        {app.accounts.map((account) => {
          const on = account.bank === choice.bank && account.last4 === choice.last4;
          return (
            <button
              key={`${account.bank}-${account.last4}`}
              className={`pm-account${on ? " on" : ""}`}
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(account)}
            >
              <img src={asset(BANKS[account.bank].logo)} alt="" />
              <b>{accountLabel(account)}</b>
              <span className="pm-radio" />
            </button>
          );
        })}
      </div>
    </PaySheet>
  );
}

// A UPI ID can belong to anyone, so its holder's name is looked up (as UPI apps do before paying)
// and must match the PAN name. The bank behind it must also be on the profile, which the bank
// checks when the payment comes in; the note says which accounts those are.
function AddUpiSheet({ amount, onPay, onClose }: { amount: number; onPay: (vpa: string) => void; onClose: () => void }) {
  const { verifiedBanks } = useMf();
  const [vpa, setVpa] = useState("");
  const [lookup, setLookup] = useState<{ vpa: string; name: string } | null>(null);
  const [someoneElse, setSomeoneElse] = useState(false);
  const typed = vpa.trim();
  const valid = VPA_RE.test(typed);

  useEffect(() => {
    setLookup(null);
    if (!valid) return;
    const timer = window.setTimeout(
      () => setLookup({ vpa: typed, name: someoneElse ? "Rohan Mehta" : PROFILE_NAME }),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [typed, valid, someoneElse]);

  const found = lookup?.vpa === typed ? lookup : null;
  const mine = found ? namesMatch(found.name) : false;

  return (
    <PaySheet
      label="Enter your UPI ID"
      onClose={onClose}
      foot={(close) => (
        <button className="mf-btn solid wide" disabled={!mine} onClick={() => close(() => onPay(typed))}>
          {investLabel(amount)}
        </button>
      )}
    >
      <h2>Enter your UPI ID</h2>
      <label className={`pm-field${found && !mine ? " error" : ""}`}>
        <span>UPI ID</span>
        <input
          className="mf-text"
          value={vpa}
          onChange={(e) => setVpa(e.target.value)}
          placeholder="name@bank"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
        />
        {valid && !found && <small className="pm-lookup">Checking the name on this UPI ID…</small>}
        {found && mine && (
          <small className="pm-lookup ok">
            <Icon name="check-circle" size={14} /> {found.name}, matches your PAN
          </small>
        )}
        {found && !mine && (
          <small>
            This UPI ID is in the name of {maskName(found.name)}. Use a UPI ID in your own name.
          </small>
        )}
      </label>
      {found && mine && (
        <p className="pm-hint">
          Approve from {verifiedBanks.map(accountLabel).join(" or ")}. A payment from any other account is
          rejected by the fund house and refunded.
        </p>
      )}
      <ProtoLink onClick={() => setSomeoneElse((v) => !v)}>
        {someoneElse ? "use a UPI ID in your name" : "simulate a UPI ID in someone else\u2019s name"}
      </ProtoLink>
    </PaySheet>
  );
}

// ---- Verify a bank account ------------------------------------------------------------------------
// Penny drop: ₹1 goes to the account, the bank returns the account holder's name, and it must match
// the name on the PAN. Only then can money for a fund come from it.

export function VerifyBankScreen({
  fundId,
  amount,
  method,
  added = false,
}: {
  fundId: string;
  amount: number;
  method: PayMethod & { account: Account };
  added?: boolean;
}) {
  const { pop, replace, verifyBank, setPayMethod } = useMf();
  const [phase, setPhase] = useState<"ask" | "checking" | "ok" | "mismatch" | "failed">("ask");
  const [forceMismatch, setForceMismatch] = useState(false);
  const account = method.account;
  const label = accountLabel(account);
  const bankName = forceMismatch ? "Rohan Mehta" : nameOnAccount(account);

  function check(fail = false) {
    setPhase("checking");
    window.setTimeout(() => {
      if (fail) setPhase("failed");
      else if (namesMatch(bankName)) {
        verifyBank(account);
        setPhase("ok");
      } else setPhase("mismatch");
    }, 2200);
  }

  function pay() {
    setPayMethod(method);
    replace({ name: "checkout", fundId, amount, back: { name: "paymode", fundId, amount } });
  }

  if (phase === "checking")
    return (
      <Screen onBack={() => {}} title="Verifying">
        <Spinner label={`Sending ₹1 to ${label}`} sub="Your bank tells us the name on the account. This takes a few seconds." />
      </Screen>
    );

  return (
    <Screen
      onBack={pop}
      plainBack
      className="pm"
      footer={
        phase === "ok" ? (
          <button className="mf-btn solid wide" onClick={pay}>
            {investLabel(amount)}
          </button>
        ) : phase === "mismatch" ? (
          <button className="mf-btn solid wide" onClick={pop}>
            Pay from another account
          </button>
        ) : (
          <button className="mf-btn solid wide" onClick={() => check()}>
            {phase === "failed" ? "Try again" : "Verify account"}
          </button>
        )
      }
    >
      <h2 className="pm-title">
        {phase === "ok"
          ? "Account verified"
          : phase === "mismatch"
            ? "This account isn\u2019t in your name"
            : phase === "failed"
              ? "We couldn\u2019t verify this account"
              : "Verify this bank account"}
      </h2>

      <div className="mf-card">
        <Row label="Account" value={label} />
        <Row label="Name on your PAN" value={PROFILE_NAME} />
        {(phase === "ok" || phase === "mismatch") && (
          <Row label="Name at the bank" value={phase === "ok" ? bankName : maskName(bankName)} />
        )}
      </div>

      {phase === "ask" && (
        <>
          <Notice icon="shield-check">
            Money for a mutual fund has to come from an account in your own name. We send ₹1 to {label} to check the
            name with your bank. You keep the ₹1.
          </Notice>
          {added && <p className="pm-hint">Once verified, this account is saved for payments and redemptions.</p>}
        </>
      )}
      {phase === "ok" && (
        <Notice icon="shield-check">
          The names match. {label} is saved to your profile, so you won&rsquo;t need to verify it again.
        </Notice>
      )}
      {phase === "mismatch" && (
        <Notice tone="error">
          The bank says this account belongs to {maskName(bankName)}. Rules don&rsquo;t allow paying for your
          investment from someone else&rsquo;s account, even a family member&rsquo;s. Pick an account in your name.
        </Notice>
      )}
      {phase === "failed" && (
        <Notice tone="warn">
          Your bank didn&rsquo;t answer in time. No money has left your account. Try again, or pay from an account
          that&rsquo;s already verified.
        </Notice>
      )}

      {phase === "ask" && (
        <>
          <ProtoLink onClick={() => setForceMismatch((v) => !v)}>
            {forceMismatch ? "name will match" : "simulate an account in someone else\u2019s name"}
          </ProtoLink>
          <ProtoLink onClick={() => check(true)}>simulate no answer from the bank</ProtoLink>
        </>
      )}
    </Screen>
  );
}

// ---- Add bank account --------------------------------------------------------------------------------

export function AddBankScreen({ fundId, amount }: { fundId: string; amount: number }) {
  const { pop, push } = useMf();
  const [number, setNumber] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [type, setType] = useState<"Savings" | "Current">("Savings");

  const numberOk = /^\d{9,18}$/.test(number);
  const mismatch = confirm.length > 0 && confirm !== number;
  const ifscOk = IFSC_RE.test(ifsc);
  const ok = numberOk && confirm === number && ifscOk;

  function go() {
    const account = { bank: bankFromIfsc(ifsc), last4: number.slice(-4) };
    push({ name: "verifybank", fundId, amount, method: { kind: "net", account }, added: true });
  }

  return (
    <Screen
      onBack={pop}
      plainBack
      className="pm"
      footer={
        <button className="mf-btn solid wide" disabled={!ok} onClick={go}>
          Continue
        </button>
      }
    >
      <h2 className="pm-title">Add bank account</h2>
      <label className="pm-field">
        <span>Account number</span>
        <input
          className="mf-text"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 18))}
          placeholder="Enter account number"
          autoComplete="off"
        />
      </label>
      <label className={`pm-field${mismatch ? " error" : ""}`}>
        <span>Confirm account number</span>
        <input
          className="mf-text"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 18))}
          placeholder="Re-enter account number"
          autoComplete="off"
        />
        {mismatch && <small>Account numbers don&rsquo;t match</small>}
      </label>
      <label className="pm-field">
        <span>IFSC code</span>
        <input
          className="mf-text"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
          placeholder="HDFC0001234"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </label>
      <div className="pm-type">
        <span>
          <Icon name="columns" size={16} />
          Account type
        </span>
        <div className="pm-seg" role="radiogroup">
          {(["Savings", "Current"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={type === t} className={type === t ? "on" : ""} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}
