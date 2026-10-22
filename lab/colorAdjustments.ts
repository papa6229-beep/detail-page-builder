export interface LevelsSettings { black: number; white: number; gamma: number; outputBlack: number; outputWhite: number }
export interface CurvePoint { x: number; y: number }
export type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';
export interface ColorAdjustments { levels: LevelsSettings; curves: Record<CurveChannel, CurvePoint[]> }
export const CURVE_CHANNELS: CurveChannel[] = ['rgb', 'red', 'green', 'blue'];
export const DEFAULT_LEVELS: Readonly<LevelsSettings> = Object.freeze({ black: 0, white: 255, gamma: 1, outputBlack: 0, outputWhite: 255 });
export const identityCurve = (): CurvePoint[] => [0, 64, 128, 192, 255].map(v => ({ x: v, y: v }));
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const number = (value: unknown, fallback: number, low: number, high: number) => typeof value === 'number' && Number.isFinite(value) ? clamp(value, low, high) : fallback;

export function isValidColorAdjustments(value: unknown): value is ColorAdjustments {
  const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
  if (!record(value) || !record(value.levels) || !record(value.curves)) return false;
  const levels = value.levels;
  if (Object.keys(DEFAULT_LEVELS).some(key => typeof levels[key] !== 'number' || !Number.isFinite(levels[key]))) return false;
  const l = levels as unknown as LevelsSettings;
  if (l.black < 0 || l.white > 255 || l.black >= l.white || l.gamma < .1 || l.gamma > 3 || l.outputBlack < 0 || l.outputWhite > 255 || l.outputBlack >= l.outputWhite) return false;
  for (const channel of CURVE_CHANNELS) {
    const points = value.curves[channel];
    if (!Array.isArray(points) || points.length < 2 || points.length > 9) return false;
    if (points.some((p, i) => !record(p) || typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 255 || p.y < 0 || p.y > 255 || (i > 0 && p.x <= points[i - 1].x))) return false;
    if (points[0].x !== 0 || points[points.length - 1].x !== 255) return false;
  }
  return true;
}

export function normalizeColorAdjustments(value?: Partial<ColorAdjustments> | null): ColorAdjustments {
  const source = value?.levels;
  const black = number(source?.black, 0, 0, 254), outputBlack = number(source?.outputBlack, 0, 0, 254);
  const levels = { black, white: number(source?.white, 255, black + 1, 255), gamma: number(source?.gamma, 1, .1, 3), outputBlack, outputWhite: number(source?.outputWhite, 255, outputBlack + 1, 255) };
  const curves = {} as ColorAdjustments['curves'];
  for (const channel of CURVE_CHANNELS) {
    const input = value?.curves?.[channel];
    let points = Array.isArray(input) ? input.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ x: clamp(Math.round(p.x), 0, 255), y: clamp(Math.round(p.y), 0, 255) })).sort((a, b) => a.x - b.x) : [];
    points = points.filter((p, i) => !i || p.x > points[i - 1].x);
    if (points.length < 2) points = identityCurve();
    if (points.length > 9) points = [...points.slice(0, 8), points[points.length - 1]];
    points[0].x = 0; points[points.length - 1].x = 255;
    curves[channel] = points;
  }
  return { levels, curves };
}

/** Shape-preserving cubic Hermite interpolation. See SciPy's PCHIP mathematical notes. */
export function curveTable(points: CurvePoint[]): Float64Array {
  const last = points.length - 1;
  const h = points.slice(0, last).map((p, i) => points[i + 1].x - p.x);
  const slope = h.map((width, i) => (points[i + 1].y - points[i].y) / width);
  const tangent = new Array(points.length).fill(0);
  const endSlope = (a: number, b: number, first: number, second: number) => {
    let result = ((2 * a + b) * first - a * second) / (a + b);
    if (Math.sign(result) !== Math.sign(first)) result = 0;
    else if (Math.sign(first) !== Math.sign(second) && Math.abs(result) > Math.abs(3 * first)) result = 3 * first;
    return result;
  };
  tangent[0] = last === 1 ? slope[0] : endSlope(h[0], h[1], slope[0], slope[1]);
  tangent[last] = last === 1 ? slope[0] : endSlope(h[last - 1], h[last - 2], slope[last - 1], slope[last - 2]);
  for (let i = 1; i < last; i++) {
    if (!slope[i - 1] || !slope[i] || Math.sign(slope[i - 1]) !== Math.sign(slope[i])) continue;
    const a = 2 * h[i] + h[i - 1], b = h[i] + 2 * h[i - 1];
    tangent[i] = (a + b) / (a / slope[i - 1] + b / slope[i]);
  }
  const table = new Float64Array(256); let segment = 0;
  for (let x = 0; x < 256; x++) {
    while (segment < last - 1 && x > points[segment + 1].x) segment++;
    const t = (x - points[segment].x) / h[segment], t2 = t * t, t3 = t2 * t;
    table[x] = clamp((2 * t3 - 3 * t2 + 1) * points[segment].y + (t3 - 2 * t2 + t) * h[segment] * tangent[segment] + (-2 * t3 + 3 * t2) * points[segment + 1].y + (t3 - t2) * h[segment] * tangent[segment + 1], 0, 255);
  }
  return table;
}

export function applyColorAdjustments(pixels: Uint8ClampedArray, input?: Partial<ColorAdjustments>) {
  const color = normalizeColorAdjustments(input), levels = color.levels;
  const rgb = curveTable(color.curves.rgb);
  const sample = (table: Float64Array, value: number) => { const low = Math.floor(value); return table[low] + (table[Math.min(255, low + 1)] - table[low]) * (value - low); };
  const tables = (['red', 'green', 'blue'] as const).map(channel => {
    const curve = curveTable(color.curves[channel]), table = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const normalized = clamp((i - levels.black) / (levels.white - levels.black), 0, 1);
      const value = levels.outputBlack + Math.pow(normalized, 1 / levels.gamma) * (levels.outputWhite - levels.outputBlack);
      table[i] = sample(curve, sample(rgb, value));
    }
    return table;
  });
  if (tables.every(table => table.every((value, i) => value === i))) return;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) for (let channel = 0; channel < 3; channel++) pixels[i + channel] = tables[channel][pixels[i + channel]];
}
