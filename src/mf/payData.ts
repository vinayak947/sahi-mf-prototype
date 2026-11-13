// Payment methods for the "Select a payment mode" flow, lifted from the
// payment-method prototype (payment-method.apk). All accounts are sample data.

export type Bank = { id: string; name: string; short: string; logo: string };

export const BANKS: Record<string, Bank> = {
  hdfc: { id: "hdfc", name: "HDFC Bank", short: "HDFC", logo: "pm-bank_hdfc.png" },
  icici: { id: "icici", name: "ICICI Bank", short: "ICICI", logo: "pm-bank_icici.png" },
  axis: { id: "axis", name: "Axis Bank", short: "Axis", logo: "pm-bank_axis_32.svg" },
  sbi: { id: "sbi", name: "SBI", short: "SBI", logo: "pm-bank_sbi_32.svg" },
  kotak: { id: "kotak", name: "Kotak Mahindra Bank", short: "Kotak", logo: "pm-bank_kotak.png" },
};

// First four letters of an IFSC code name the bank.
const IFSC_BANK: Record<string, string> = { HDFC: "hdfc", ICIC: "icici", UTIB: "axis", SBIN: "sbi", KKBK: "kotak" };

export type Account = { bank: string; last4: string };

export type UpiApp = {
  id: string;
  name: string;
  logo: string;
  filled?: boolean; // logo fills the whole circle (no white plate)
  accounts: Account[];
};

export const UPI_APPS: UpiApp[] = [
  { id: "gpay", name: "Google Pay", logo: "pm-upi_gpay.png", accounts: [{ bank: "hdfc", last4: "8745" }, { bank: "sbi", last4: "2231" }] },
  { id: "phonepe", name: "PhonePe UPI", logo: "pm-upi_phonepe.png", filled: true, accounts: [{ bank: "icici", last4: "3162" }, { bank: "axis", last4: "5520" }, { bank: "hdfc", last4: "8745" }] },
  { id: "paytm", name: "Paytm UPI", logo: "pm-upi_paytm.png", accounts: [{ bank: "sbi", last4: "2231" }] },
  { id: "amazon", name: "Amazon Pay", logo: "pm-upi_amazonpay_32.png", accounts: [{ bank: "axis", last4: "5520" }] },
  { id: "bhim", name: "BHIM", logo: "pm-upi_bhim.png", accounts: [{ bank: "sbi", last4: "2231" }] },
  { id: "imobile", name: "iMobile Pay", logo: "pm-bank_icici.png", accounts: [{ bank: "icici", last4: "3162" }] },
];

// The first three show on "Select a payment mode"; "View all" lists every app.
export const FEATURED_UPI = UPI_APPS.slice(0, 3);

export const upiApp = (id: string) => UPI_APPS.find((a) => a.id === id) ?? UPI_APPS[0];

// ---- The investor's own bank accounts ------------------------------------------------
// Money for a mutual fund must come from an account in the investor's own name (no third-party
// payments). An account counts once a ₹1 penny drop shows the bank's name matches the PAN name.

export const PROFILE_NAME = "Aarav Mehta"; // sample investor, as on PAN

// Verified when the investor signed up. The other accounts in the UPI apps are not, yet.
export const REGISTERED: Account[] = [
  { bank: "hdfc", last4: "8745" },
  { bank: "sbi", last4: "2231" },
];

export const sameAccount = (a: Account, b: Account) => a.bank === b.bank && a.last4 === b.last4;

// Sample answers from the penny drop: the Axis account in the UPI apps is a relative's.
const ACCOUNT_NAMES: Record<string, string> = { "axis-5520": "Rohan Mehta" };
export const nameOnAccount = (a: Account) => ACCOUNT_NAMES[`${a.bank}-${a.last4}`] ?? PROFILE_NAME;

// "Rohan Mehta" -> "R**** M****": enough to recognise, without showing someone else's full name.
export const maskName = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0] + "*".repeat(Math.max(part.length - 1, 1)))
    .join(" ");

// Names match if every word of the PAN name is in the bank's name, ignoring case and order.
export const namesMatch = (bankName: string, panName = PROFILE_NAME) => {
  const words = new Set(bankName.toLowerCase().split(/\s+/));
  return panName.toLowerCase().split(/\s+/).every((w) => words.has(w));
};

// Payments are UPI only for now, for both SIP and one-time. Net banking (and eNACH) come later once scoped;
// the section and its screens are kept, hidden behind this switch.
export const NET_BANKING_ENABLED = false;

// Net banking opens for larger payments only; under this the linked banks are listed but not pickable.
export const NET_BANKING_MIN = 20000;

export type PayMethod =
  | { kind: "upi"; app: string; account: Account }
  | { kind: "id"; vpa: string }
  | { kind: "net"; account: Account };

export const DEFAULT_METHOD: PayMethod = { kind: "upi", app: "gpay", account: UPI_APPS[0].accounts[0] };

// AutoPay runs on a bank account; a UPI ID has none on file, so it falls back to the default one.
export const mandateAccount = (m: PayMethod): Account => (m.kind === "id" ? DEFAULT_METHOD.account : m.account);

export const accountLabel = (a: Account) => (a.last4 ? `${BANKS[a.bank].short} **** ${a.last4}` : BANKS[a.bank].name);

export const VPA_RE = /^[\w.-]{2,}@[a-z]{2,}$/i;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function bankFromIfsc(ifsc: string): string {
  return IFSC_BANK[ifsc.slice(0, 4).toUpperCase()] ?? "hdfc";
}

export function methodView(m: PayMethod): { logo: string; filled?: boolean; title: string; sub: string } {
  if (m.kind === "upi") {
    const app = upiApp(m.app);
    return { logo: app.logo, filled: app.filled, title: app.name, sub: accountLabel(m.account) };
  }
  if (m.kind === "id") return { logo: "pm-upi_bhim.png", title: "UPI ID", sub: m.vpa };
  return { logo: BANKS[m.account.bank].logo, title: "Net Banking", sub: accountLabel(m.account) };
}
