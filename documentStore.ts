import type { ProductData } from './types';
import type { SetStateAction } from 'react';

export interface ProjectMeta { id: string; name: string; customName: string; createdAt: number; updatedAt: number; imageCount: number }
type OptionLayout = Pick<ProductData['options'][number], 'x' | 'y' | 'width' | 'height'>;
type Layout = Pick<ProductData, 'previewImageTransforms' | 'productFraming' | 'packageLayout' | 'thumbnailPackageLayout'> & { optionLayouts: Record<string, OptionLayout> };
interface Snapshot { data: ProductData; project: ProjectMeta; canUndo: boolean; canRedo: boolean; imageGesture: boolean }
const layout = (data: ProductData): Layout => ({ previewImageTransforms: data.previewImageTransforms ?? {}, productFraming: data.productFraming ?? {}, packageLayout: data.packageLayout, thumbnailPackageLayout: data.thumbnailPackageLayout, optionLayouts: Object.fromEntries(data.options.map(({ id, x, y, width, height }) => [id, { x, y, width, height }])) });
const applyLayout = (data: ProductData, value: Layout): ProductData => ({ ...data, previewImageTransforms: value.previewImageTransforms, productFraming: value.productFraming, packageLayout: value.packageLayout, thumbnailPackageLayout: value.thumbnailPackageLayout, options: data.options.map(option => ({ ...option, ...value.optionLayouts[option.id] })) });
const equal = (a: Layout, b: Layout) => JSON.stringify(a) === JSON.stringify(b);
const sources = (data: ProductData) => [data.mainImage, data.thumbnailImage, data.packageImage, data.featureImage, data.point1Image1, data.point1Image2, data.point1Image3, data.point2Image1, data.point2Image2, data.point2Image3, data.sizeImage, data.videoInsertImage, data.watermarkImage, ...data.options.flatMap(option => [option.id, option.image])];

export class BuilderDocumentStore {
  private listeners = new Set<() => void>();
  private past: { before: Layout; after: Layout }[] = [];
  private future: { before: Layout; after: Layout }[] = [];
  private transaction: Layout | null = null;
  private snapshot: Snapshot;
  constructor(data: ProductData) {
    this.snapshot = { data, project: { id: '', name: '', customName: '', createdAt: 0, updatedAt: 0, imageCount: 0 }, canUndo: false, canRedo: false, imageGesture: false };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() {
    this.snapshot = { ...this.snapshot, canUndo: this.past.length > 0, canRedo: this.future.length > 0, imageGesture: this.transaction !== null };
    this.listeners.forEach(listener => listener());
  }
  setData = (value: SetStateAction<ProductData>) => {
    const previous = this.snapshot.data, next = typeof value === 'function' ? value(previous) : value;
    if (next === previous) return;
    const before = sources(previous), after = sources(next);
    if (before.length !== after.length || before.some((source, i) => source !== after[i])) { this.past = []; this.future = []; this.transaction = null; }
    this.snapshot = { ...this.snapshot, data: next }; this.emit();
  };
  beginImageEdit = () => { if (!this.transaction) { this.transaction = layout(this.snapshot.data); this.emit(); } };
  endImageEdit = () => {
    if (!this.transaction) return;
    const before = this.transaction, after = layout(this.snapshot.data); this.transaction = null;
    if (!equal(before, after)) { this.past = [...this.past, { before, after }].slice(-50); this.future = []; }
    this.emit();
  };
  edit = (value: SetStateAction<ProductData>) => {
    const own = this.transaction === null;
    if (own) this.beginImageEdit(); this.setData(value); if (own) this.endImageEdit();
  };
  undo = () => {
    this.endImageEdit(); const entry = this.past.pop(); if (!entry) return;
    this.future.push(entry); this.snapshot = { ...this.snapshot, data: applyLayout(this.snapshot.data, entry.before) }; this.emit();
  };
  redo = () => {
    this.endImageEdit(); const entry = this.future.pop(); if (!entry) return;
    this.past.push(entry); this.snapshot = { ...this.snapshot, data: applyLayout(this.snapshot.data, entry.after) }; this.emit();
  };
  replaceProject = (project: ProjectMeta, data: ProductData) => {
    this.past = []; this.future = []; this.transaction = null;
    this.snapshot = { ...this.snapshot, project, data }; this.emit();
  };
  rename = (customName: string) => { this.snapshot = { ...this.snapshot, project: { ...this.snapshot.project, customName } }; this.emit(); };
}

export const projectName = (project: ProjectMeta, data: ProductData) => project.customName.trim() || data.productNameKr.trim() || '새 상품';
