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

export type IconName = keyof typeof DLS_BY_NAME | "back";

const cache = new Map<string, string>();

function maskFor(name: IconName): string {
  if (name === "back") return `url("${BACK}")`;
  let uri = cache.get(name);
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${DLS_PATHS[DLS_BY_NAME[name]]}"/></svg>`;
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
