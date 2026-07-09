// Deterministic gradient artwork for items without an image.
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface CoverHues {
  hueA: number;
  hueB: number;
  angle: number;
}

export function coverHues(seed: string): CoverHues {
  const h = hash(seed);
  const hueA = h % 360;
  return {
    hueA,
    hueB: (hueA + 40 + (h % 80)) % 360,
    angle: h % 180,
  };
}

export function coverGradient(seed: string): string {
  const { hueA, hueB, angle } = coverHues(seed);
  return `linear-gradient(${angle}deg, hsl(${hueA} 45% 22%), hsl(${hueB} 60% 42%))`;
}

export function coverInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
