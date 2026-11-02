import { Icon, type IconName } from "./Icon";

// Smooth line through [x, y] points (0..1, y up) in a 100 x 100 box, as a
// Catmull-Rom spline converted to cubic beziers.
function smoothPath(points: [number, number][]): string {
  const pts = points.map(([x, y]) => [x * 100, (1 - y) * 100] as const);
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export type AnalysisProps = {
  title: string;
  change: string;
  exchange?: string;
  tone: "up" | "down";
  trend: { label: string; since: string; icon: IconName; tone: "up" | "down" | "flat" };
  chips: string[];
  series: [number, number][];
  // label + position from the top of the plot (0..1)
  yTicks: [string, number][];
  badge: string;
  xLabels: [[string, string], [string, string]];
};

export function AnalysisModule(p: AnalysisProps) {
  const line = smoothPath(p.series);
  const last = p.series[p.series.length - 1];
  const area = `${line} L 100 100 L 0 100 Z`;

  return (
    <div className="analysis">
      <div className="analysis-head">
        <div>
          <div className="analysis-title">
            <strong>{p.title}</strong>
            <span className={p.tone}>{p.change}</span>
            {p.exchange && <small>{p.exchange}</small>}
            <Icon name="caret-down" size={12} />
          </div>
          <span className="analysis-sub">Day&rsquo;s analysis</span>
        </div>
        <button className="trend-pill">
          <Icon name={p.trend.icon} size={16} className={`trend-${p.trend.tone}`} />
          <span>
            <b className={`trend-${p.trend.tone}`}>{p.trend.label}</b>
            <small>
              {p.trend.since} <Icon name="caret-right" size={10} />
            </small>
          </span>
        </button>
      </div>

      <div className="chip-row">
        {p.chips.map((chip, index) => (
          <button className={`chip${index === 0 ? " active" : ""}`} key={chip}>
            {chip}
          </button>
        ))}
      </div>

      <div className="chart">
        <div className="chart-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {p.yTicks.map(([, pos]) => (
              <line
                className="chart-grid"
                key={pos}
                x1="0"
                x2="100"
                y1={pos * 100}
                y2={pos * 100}
              />
            ))}
            <path className={`chart-area ${p.tone}`} d={area} />
            <path className={`chart-line ${p.tone}`} d={line} />
          </svg>
          <span
            className={`chart-badge ${p.tone}`}
            style={{ top: `${(1 - last[1]) * 100}%` }}
          >
            {p.badge}
          </span>
        </div>
        <div className="chart-axis">
          {p.yTicks.map(([label, pos]) => (
            <span key={label} style={{ top: `${pos * 100}%` }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="chart-x">
        {p.xLabels.map(([time, date]) => (
          <span key={time}>
            {time}
            <b>{date}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
