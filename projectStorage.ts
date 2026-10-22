import { INITIAL_PRODUCT_DATA } from './constants';
import type { ProductData } from './types';
import type { ProjectMeta } from './documentStore';
import { normalizeShadow } from './lab/shadow';
import { isValidColorAdjustments, normalizeColorAdjustments } from './lab/colorAdjustments';

const databaseName = 'detail-page-builder-workspace';
let connection: Promise<IDBDatabase> | null = null;
function openDatabase() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, keyPath] of [['headers', 'id'], ['documents', 'id'], ['workspace', 'key']]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = null; }; resolve(db); };
    request.onerror = () => { connection = null; reject(request.error ?? new Error('작업 저장소를 열지 못했습니다.')); };
    request.onblocked = () => { connection = null; reject(new Error('다른 빌더 창을 닫고 다시 시도해주세요.')); };
  });
  return connection;
}
async function read<T>(store: string, key?: string): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly'), request = key === undefined ? transaction.objectStore(store).getAll() : transaction.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); transaction.onabort = () => reject(transaction.error);
  });
}
export function normaliseDocument(input: unknown): ProductData {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('빌더 작업 파일이 아닙니다.');
  const raw = input as Record<string, unknown>;
  if (typeof raw.productNameKr !== 'string' || !raw.summaryInfo || typeof raw.summaryInfo !== 'object' || Array.isArray(raw.summaryInfo) || !Array.isArray(raw.options)) throw new Error('작업 파일의 상품 정보를 확인할 수 없습니다.');
  const allowed = new Set([...Object.keys(INITIAL_PRODUCT_DATA), 'packageLayout', 'thumbnailPackageLayout', 'sectionSpacing', 'imageEdits', 'productFraming', 'previewImageTransforms']);
  const fields = Object.fromEntries(Object.entries(raw).filter(([key]) => allowed.has(key)));
  const result = { ...structuredClone(INITIAL_PRODUCT_DATA), ...fields } as ProductData;
  for (const [key, defaultValue] of Object.entries(INITIAL_PRODUCT_DATA)) {
    if (typeof defaultValue === 'string' && typeof result[key as keyof ProductData] !== 'string') throw new Error('작업 파일의 텍스트 형식이 올바르지 않습니다.');
    if (defaultValue === null && result[key as keyof ProductData] !== null && typeof result[key as keyof ProductData] !== 'string') throw new Error('작업 파일의 사진 형식이 올바르지 않습니다.');
    if (typeof defaultValue === 'boolean' && typeof result[key as keyof ProductData] !== 'boolean') throw new Error('작업 파일의 표시 설정이 올바르지 않습니다.');
  }
  result.summaryInfo = { ...INITIAL_PRODUCT_DATA.summaryInfo, ...(raw.summaryInfo as ProductData['summaryInfo']) };
  if (Object.values(result.summaryInfo).some(value => typeof value !== 'string')) throw new Error('작업 파일의 스펙 형식이 올바르지 않습니다.');
  if (result.options.some(option => !option || typeof option.id !== 'string' || typeof option.name !== 'string' || !(option.image === null || typeof option.image === 'string'))) throw new Error('작업 파일의 옵션 형식이 올바르지 않습니다.');
  const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const numbers = (value: unknown, keys: string[]) => record(value) && keys.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]));
  for (const key of ['watermarkSettings', 'sectionSpacing', 'imageEdits', 'productFraming', 'previewImageTransforms'] as const) {
    if (result[key] !== undefined && !record(result[key])) throw new Error('작업 파일의 편집 설정이 올바르지 않습니다.');
  }
  if (Object.values(result.previewImageTransforms ?? {}).some(value => !numbers(value, ['x', 'y', 'scale', 'angle']) || value.scale <= 0)) throw new Error('작업 파일의 이미지 배치가 올바르지 않습니다.');
  if (Object.values(result.sectionSpacing ?? {}).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('작업 파일의 섹션 간격이 올바르지 않습니다.');
  if (Object.values(result.watermarkSettings ?? {}).some(value => !numbers(value, ['x', 'y', 'width', 'height']) || typeof value.show !== 'boolean')) throw new Error('작업 파일의 워터마크 설정이 올바르지 않습니다.');
  if (Object.values(result.productFraming ?? {}).some(value => !numbers(value, ['imageWidth', 'imageHeight', 'ratio', 'zoom', 'offsetX', 'offsetY']) || !numbers(value.bounds, ['left', 'top', 'width', 'height']) || value.imageWidth <= 0 || value.imageHeight <= 0 || value.zoom <= 0 || value.bounds.width <= 0 || value.bounds.height <= 0)) throw new Error('작업 파일의 제품 맞춤 설정이 올바르지 않습니다.');
  if (Object.values(result.imageEdits ?? {}).some(value => !record(value) || typeof value.original !== 'string' || typeof value.tone !== 'number' || !Number.isFinite(value.tone) || !(record(value.shadow) || typeof value.shadow === 'boolean'))) throw new Error('작업 파일의 사진 보정 설정이 올바르지 않습니다.');
  if (result.imageEdits) result.imageEdits = Object.fromEntries(Object.entries(result.imageEdits).map(([key, edit]) => {
    const shadow = edit.shadow;
    if (typeof shadow !== 'boolean' && (('enabled' in shadow && typeof shadow.enabled !== 'boolean') || ['opacity', 'offsetX', 'offsetY', 'blur', 'width', 'depth', 'angle'].some(field => field in shadow && (typeof shadow[field] !== 'number' || !Number.isFinite(shadow[field]))))) throw new Error('작업 파일의 그림자 설정이 올바르지 않습니다.');
    if (edit.color !== undefined && !isValidColorAdjustments(edit.color)) throw new Error('작업 파일의 레벨·커브 설정이 올바르지 않습니다.');
    return [key, { original: edit.original, tone: Math.max(0, Math.min(100, edit.tone)), shadow: normalizeShadow(shadow), ...(edit.color ? { color: normalizeColorAdjustments(edit.color) } : {}) }];
  }));
  for (const key of ['packageLayout', 'thumbnailPackageLayout'] as const) if (result[key] !== undefined && !numbers(result[key], ['x', 'y', 'width', 'height'])) throw new Error('작업 파일의 패키지 배치가 올바르지 않습니다.');
  if (new Set(result.options.map(option => option.id)).size !== result.options.length || result.options.some(option => !numbers(option, ['x', 'y', 'width', 'height']))) throw new Error('작업 파일의 옵션 배치가 올바르지 않습니다.');
  return result;
}
export const listProjects = async () => (await read<ProjectMeta[]>('headers')).sort((a, b) => b.updatedAt - a.updatedAt);
export const readActiveProject = async () => (await read<{ key: string; id: string } | undefined>('workspace', 'active'))?.id;
export async function readProject(id: string) {
  const [meta, document] = await Promise.all([read<ProjectMeta | undefined>('headers', id), read<{ id: string; data: unknown } | undefined>('documents', id)]);
  if (!meta || !document) throw new Error('보관한 작업을 찾지 못했습니다. 현재 작업은 유지합니다.');
  return { meta, data: normaliseDocument(document.data) };
}
export async function saveProject(meta: ProjectMeta, data: ProductData, activate = false) {
  const clean = normaliseDocument(data), db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(activate ? ['headers', 'documents', 'workspace'] : ['headers', 'documents'], 'readwrite');
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('작업을 저장하지 못했습니다.'));
    try {
      tx.objectStore('headers').put(meta); tx.objectStore('documents').put({ id: meta.id, data: clean });
      if (activate) tx.objectStore('workspace').put({ key: 'active', id: meta.id });
    } catch (cause) { tx.abort(); reject(cause); }
  });
}
export async function activateProject(id: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('workspace', 'readwrite'); tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error); tx.objectStore('workspace').put({ key: 'active', id }); });
}
export function legacyDocument(): ProductData | null {
  const json = localStorage.getItem('builder_temp_save'); return json ? normaliseDocument(JSON.parse(json)) : null;
}
export function parseProjectFile(text: string) {
  const json = JSON.parse(text);
  if (json?.format === 'detail-page-builder-project') {
    if (json.version !== 1) throw new Error('이 버전의 작업 파일은 아직 열 수 없습니다.');
    return { data: normaliseDocument(json.data), name: typeof json.name === 'string' ? json.name : '' };
  }
  return { data: normaliseDocument(json), name: '' };
}
export function storageError(error: unknown) {
  const value = error as { name?: string; message?: string };
  return value?.name === 'QuotaExceededError' ? '저장 공간이 부족합니다. 작업 파일을 내려받아 보관해주세요.' : value?.message || '저장하지 못했습니다. 작업은 화면에 남아 있습니다. 다시 시도해주세요.';
}
