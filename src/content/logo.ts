const INK = "#e8e6e1";
const AMBER = "#ffb35c";

const lines: Array<[number, number, number, number]> = [
  [11, 14, 11, 46],
  [11, 14, 24, 14],
  [11, 30, 21, 30],
  [11, 46, 24, 46],
  [33, 14, 43, 46],
  [53, 14, 43, 46],
];
const nodes: Array<[number, number]> = [
  [11, 14],
  [24, 14],
  [11, 30],
  [21, 30],
  [11, 46],
  [24, 46],
  [33, 14],
  [53, 14],
];

export function logoSvg({ tile = false, ink = INK }: { tile?: boolean; ink?: string } = {}) {
  const parts = [
    tile ? `<rect width="64" height="64" rx="14" fill="#08090b"/>` : "",
    ...lines.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/>`),
    ...nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${ink}"/>`),
    `<circle cx="43" cy="46" r="8" fill="none" stroke="${AMBER}" stroke-opacity="0.4" stroke-width="1.6"/>`,
    `<circle cx="43" cy="46" r="4.8" fill="${AMBER}"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${parts.join("")}</svg>`;
}

export const logoDataUri = (opts?: { tile?: boolean }) =>
  `data:image/svg+xml;base64,${Buffer.from(logoSvg(opts)).toString("base64")}`;

export const logoGeometry = { lines, nodes, ink: INK, amber: AMBER };
