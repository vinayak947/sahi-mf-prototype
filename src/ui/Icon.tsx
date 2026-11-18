import { asset } from "../assets";
import { DLS_PATHS, type DlsIconKey } from "./dlsIcons";

// DlsIcons only (SAHI Components · DLS → Icons). Each glyph is a filled path on a 24 grid, drawn as a CSS
// mask so it takes the text colour of whatever it sits in. The old Phosphor line icons are gone: they were
// a stroke weight the DLS does not use, which is why 3-dots and filter looked hairline.
// Call sites keep their names; each name points at the DLS glyph that replaces it.
const DLS_BY_NAME = {
  "caret-right": "chevron_right",
  "chevron-right": "chevron_right",
  "chevron-down": "chevron_down",
  "chevron-down-solid": "chevron_down",
  "caret-down": "chevron_down",
  "caret-up-down": "chevrons_up_down",
  "caret-left-right": "chevrons_left_right",
  "dots-three-vertical": "more_vertical",
  "funnel-simple": "filter_lines",
  "magnifying-glass": "search",
  "list-bullets": "left_to_right_list_bullet",
  "share-network": "share03",
  "sparkle-fill": "sparkles",
  "file-text-fill": "file_text",
  "check-circle": "circle_check",
  "warning-circle": "alert_circle",
  "x-circle": "circle_x",
  "nav-clock": "clock",
  "trend-down": "trending_down",
  "wave-sine": "pulse",
  lightning: "flash",
  columns: "layout_two_column",
  "chart-line": "chart_line",
  info: "info",
  check: "check",
  "circle-check-filled": "circle_check_filled",
  "hourglass-circle-filled": "hourglass_circle_filled",
  "alert-circle-filled": "alert_circle_filled",
  circle: "circle",
  calendar: "calendar",
  clock: "clock",
  plus: "plus",
  x: "x",
  link: "link",
  copy: "copy",
  backspace: "backspace",
  "shield-check": "shield_check",
} as const satisfies Record<string, DlsIconKey>;

// The DLS chevron_left glyph, shipped earlier as an asset (DlsIcons U+E02A).
const BACK = asset("dls-chevron-left.svg");
// The DLS filter glyph (DlsIcons U+E1DF), the funnel on the filter chip of the fund lists.
const FILTER = asset("dls-filter.svg");
// The Base Design System x (node 3703:14584): a 1.5 stroke cross on a 24 grid, the clear button in the amount field.
const BASE_X = asset("base-x.svg");

// Custom, no DlsIcons glyph exists for it yet: 1.5 stroke eye / eye-off on a 24 grid, for the Portfolio "hide values" toggle.
const CUSTOM: Record<string, string> = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off":
    '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
};

export type IconName = keyof typeof DLS_BY_NAME | "back" | "dls-filter" | "base-x" | "eye" | "eye-off";

const cache = new Map<string, string>();

function maskFor(name: IconName): string {
  if (name === "back") return `url("${BACK}")`;
  if (name === "dls-filter") return `url("${FILTER}")`;
  if (name === "base-x") return `url("${BASE_X}")`;
  let uri = cache.get(name);
  if (!uri && name in CUSTOM) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CUSTOM[name]}</svg>`;
    uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    cache.set(name, uri);
  }
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${DLS_PATHS[DLS_BY_NAME[name as keyof typeof DLS_BY_NAME]]}"/></svg>`;
    uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    cache.set(name, uri);
  }
  return uri;
}

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const mask = maskFor(name);
  return (
    <span
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}
