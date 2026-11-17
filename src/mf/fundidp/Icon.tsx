// The fund page asks for a few icon names the shared Icon does not have (star, filter, share, a back chevron).
// Those are drawn here from the DLS glyph files; every other name goes to the shared Icon unchanged.
import { asset } from "../../assets";
import { Icon as SharedIcon, type IconName as SharedIconName } from "../../ui/Icon";

const EXTRA = {
  "chevron-left": asset("dls-chevron-left.svg"),
  "star-filled": asset("dls-star-filled.svg"),
  "dls-filter": asset("dls-filter.svg"),
  "share-02": asset("ph-share-02-idp.svg"),
} as const;

export type IconName = SharedIconName | keyof typeof EXTRA;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  if (name in EXTRA) {
    const mask = `url("${EXTRA[name as keyof typeof EXTRA]}")`;
    return (
      <span
        aria-hidden="true"
        className={`icon ${className}`.trim()}
        style={{ width: size, height: size, WebkitMaskImage: mask, maskImage: mask }}
      />
    );
  }
  return <SharedIcon name={name as SharedIconName} size={size} className={className} />;
}
