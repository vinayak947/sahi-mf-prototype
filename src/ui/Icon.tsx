import { asset } from "../assets";

// Phosphor icons (Design.md: Regular weight; fills only for selected states),
// drawn as CSS masks so they take the text colour of whatever they sit in.
const icons = {
  "arrow-left": asset("ph-arrow-left.svg"),
  back: asset("dls-chevron-left.svg"), // DLS chevron_left (DlsIcons U+E02A)
  backspace: asset("backspace.svg"),
  bank: asset("ph-bank.svg"),
  calendar: asset("calendar.svg"),
  "nav-clock": asset("nav-clock.svg"),
  check: asset("ph-check.svg"),
  "check-circle": asset("ph-check-circle.svg"),
  clock: asset("ph-clock.svg"),
  "caret-left": asset("ph-caret-left.svg"),
  "chevron-left": asset("chevron-left.svg"),
  "chevron-right": asset("chevron-right.svg"),
  "chevron-down": asset("chevron-down.svg"),
  "chevron-down-solid": asset("chevron-down-solid.svg"),
  "shield-check": asset("ph-shield-check.svg"),
  "warning-circle": asset("ph-warning-circle.svg"),
  x: asset("ph-x.svg"),
  "x-circle": asset("ph-x-circle.svg"),
  "bookmark-simple-fill": asset("ph-bookmark-simple-fill.svg"),
  "briefcase-fill": asset("ph-briefcase-fill.svg"),
  "caret-down": asset("ph-caret-down.svg"),
  "caret-left-right": asset("ph-caret-left-right.svg"),
  "caret-right": asset("ph-caret-right.svg"),
  "caret-up-down": asset("ph-caret-up-down.svg"),
  "chart-line": asset("ph-chart-line.svg"),
  columns: asset("ph-columns.svg"),
  "dots-three-vertical": asset("ph-dots-three-vertical.svg"),
  "file-text-fill": asset("ph-file-text-fill.svg"),
  "funnel-simple": asset("ph-funnel-simple.svg"),
  info: asset("ph-info.svg"),
  lightning: asset("ph-lightning.svg"),
  link: asset("ph-link.svg"),
  "list-bullets": asset("ph-list-bullets.svg"),
  "magnifying-glass": asset("ph-magnifying-glass.svg"),
  "magnifying-glass-plus": asset("ph-magnifying-glass-plus.svg"),
  plus: asset("ph-plus.svg"),
  "share-network": asset("ph-share-network.svg"),
  sparkle: asset("ph-sparkle.svg"),
  "sparkle-fill": asset("ph-sparkle-fill.svg"),
  "trend-down": asset("ph-trend-down.svg"),
  "trend-up": asset("ph-trend-up.svg"),
  "wave-sine": asset("ph-wave-sine.svg"),
};

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const mask = `url("${icons[name]}")`;
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
