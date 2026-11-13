import { asset } from "../assets";

// Illustrated goal cards (home) and goal posters (list page). One placement describes where a picture sits
// inside its frame; the same picture is cropped differently on the card, in light and in dark, and on the poster.

// A picture placed in a frame. x / y / w / h position the frame's box in px; `fit` (left, top, width, height in %)
// re-crops the image inside that box when the source has margins to trim.
export type ArtPlacement = {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fit?: [number, number, number, number];
};

export type GoalArtSpec = {
  eyebrow: string; // small line above the big number on card and poster
  copyWidth?: number; // poster copy block width, when the default 247px wraps badly
  hero: ArtPlacement; // poster picture (always on black)
  card: { light: ArtPlacement; dark: ArtPlacement };
};

// Positions `art` inside its parent. With `frame` (the parent's width) the box is placed from the right edge,
// and `mirror` flips it, so one picture can fill both sides of a poster wider than the picture.
export function ArtBox({
  art,
  className,
  frame,
  mirror,
}: {
  art: ArtPlacement;
  className: string;
  frame?: number;
  mirror?: boolean;
}) {
  const [left, top, width, height] = art.fit ?? [0, 0, 100, 100];
  const side =
    frame === undefined ? { left: art.x } : { right: mirror ? frame - art.x : frame - (art.x + art.w) };
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ ...side, top: art.y, width: art.w, height: art.h, transform: mirror ? "scaleX(-1)" : undefined }}
    >
      <img
        src={asset(art.src)}
        alt=""
        draggable={false}
        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      />
    </span>
  );
}

const POSTER_WIDTH = 361;

// The black poster at the top of a goal page: the picture mirrored behind itself, then the copy.
export function GoalHero({ art, big, promise }: { art: GoalArtSpec; big: string; promise: string }) {
  return (
    <div className="bucket-hero">
      <ArtBox art={art.hero} className="bucket-art" frame={POSTER_WIDTH} mirror />
      <ArtBox art={art.hero} className="bucket-art" frame={POSTER_WIDTH} />
      <div className="hero-copy" style={art.copyWidth ? { width: art.copyWidth } : undefined}>
        <small className="bucket-eyebrow">{art.eyebrow}</small>
        <h2>{big}</h2>
        <p>{promise}</p>
      </div>
    </div>
  );
}
