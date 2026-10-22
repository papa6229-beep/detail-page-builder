import type { ProductData, SummaryInfo } from './types';

export interface ReviewField { id: string; label: string; value: string }
export interface TextSuggestion {
  id: string; field: string; label: string; original: string;
  before: string; after: string; start: number; end: number; reason: string;
}
const textKeys = {
  productNameKr: '한글 상품명', productNameEn: '영문 상품명', brandName: '브랜드명', aiSummary: '핵심 요약',
  featureTitle: '핵심 특징 제목', aiFeatureDesc: '핵심 특징 설명', point1Title: '포인트 1 제목',
  aiPoint1Desc: '포인트 1-1 설명', aiPoint1Desc2: '포인트 1-2 설명', aiPoint1Desc3: '포인트 1-3 설명',
  point2Title: '포인트 2 제목', aiPoint2Desc: '포인트 2-1 설명', aiPoint2Desc2: '포인트 2-2 설명', aiPoint2Desc3: '포인트 2-3 설명',
};
const summaryKeys: Record<keyof SummaryInfo, string> = { feature: '특징', type: '타입', material: '재질', size: '치수', weight: '무게', power: '전원', maker: '제조사' };

export function collectReviewFields(data: ProductData): ReviewField[] {
  const fields: ReviewField[] = [];
  const add = (id: string, label: string, value: unknown) => {
    if (typeof value === 'string' && value.trim() && value !== '__ENABLED__') fields.push({ id, label, value });
  };
  for (const [key, label] of Object.entries(textKeys)) add(key, label, data[key as keyof typeof textKeys]);
  for (const [key, label] of Object.entries(summaryKeys)) add(`summary.${key}`, `스펙 · ${label}`, data.summaryInfo[key as keyof SummaryInfo]);
  data.options.forEach((option, i) => add(`option:${option.id}`, `옵션 ${i + 1} 이름`, option.name));
  return fields;
}

const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) ?? []).join('|');
const markers = (text: string) => (text.match(/##/g) ?? []).length;

export function parseReviewSuggestions(payload: unknown, fields: ReviewField[]): TextSuggestion[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { suggestions?: unknown }).suggestions)) throw new Error('검수 결과 형식을 읽지 못했습니다. 다시 검수해주세요.');
  const source = new Map(fields.map(field => [field.id, field]));
  const result: TextSuggestion[] = [];
  for (const item of (payload as { suggestions: unknown[] }).suggestions.slice(0, 120)) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    if (typeof value.field !== 'string' || typeof value.before !== 'string' || typeof value.after !== 'string' || typeof value.reason !== 'string') continue;
    const field = source.get(value.field);
    if (!field || !value.before || value.before === value.after || value.before.length > 2000 || value.after.length > 2000 || !Number.isInteger(value.occurrence) || Number(value.occurrence) < 0 || Number(value.occurrence) > 1000) continue;
    if (numbers(value.before) !== numbers(value.after) || markers(value.before) !== markers(value.after)) continue;
    let start = -1;
    for (let n = 0; n <= Number(value.occurrence); n++) { start = field.value.indexOf(value.before, start < 0 ? 0 : start + value.before.length); if (start < 0) break; }
    if (start < 0) continue;
    const end = start + value.before.length;
    if (result.some(other => other.field === field.id && start < other.end && end > other.start)) continue;
    result.push({ id: `${field.id}:${start}:${end}`, field: field.id, label: field.label, original: field.value, before: value.before, after: value.after, start, end, reason: value.reason.trim().slice(0, 300) });
  }
  return result;
}

export function applyTextSuggestions(data: ProductData, selected: TextSuggestion[]): { data: ProductData; applied: number; skipped: number } {
  let next = data, applied = 0, skipped = 0;
  const current = new Map(collectReviewFields(data).map(field => [field.id, field.value]));
  const groups = new Map<string, TextSuggestion[]>();
  for (const suggestion of selected) groups.set(suggestion.field, [...(groups.get(suggestion.field) ?? []), suggestion]);
  for (const [key, suggestions] of groups) {
    const original = current.get(key);
    if (original === undefined || suggestions.some(item => item.original !== original)) { skipped += suggestions.length; continue; }
    let text = original, boundary = text.length;
    for (const item of [...suggestions].sort((a, b) => b.start - a.start)) {
      if (item.start < 0 || item.end > boundary || original.slice(item.start, item.end) !== item.before || numbers(item.before) !== numbers(item.after) || markers(item.before) !== markers(item.after)) { skipped++; continue; }
      text = text.slice(0, item.start) + item.after + text.slice(item.end); boundary = item.start; applied++;
    }
    if (key.startsWith('option:')) next = { ...next, options: next.options.map(option => option.id === key.slice(7) ? { ...option, name: text } : option) };
    else if (key.startsWith('summary.') && Object.hasOwn(summaryKeys, key.slice(8))) next = { ...next, summaryInfo: { ...next.summaryInfo, [key.slice(8)]: text } };
    else if (Object.hasOwn(textKeys, key)) next = { ...next, [key]: text };
  }
  return { data: next, applied, skipped };
}
