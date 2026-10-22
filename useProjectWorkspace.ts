import { useEffect, useRef, useState } from 'react';
import { BuilderDocumentStore, projectName, type ProjectMeta } from './documentStore';
import { INITIAL_PRODUCT_DATA } from './constants';
import { activateProject, legacyDocument, listProjects, parseProjectFile, readActiveProject, readProject, saveProject, storageError } from './projectStorage';
import type { ProductData } from './types';

export function useProjectWorkspace(store: BuilderDocumentStore, snapshot: ReturnType<BuilderDocumentStore['getSnapshot']>) {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('작업 불러오는 중…'), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const queue = useRef<Promise<unknown>>(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticket = useRef(0), saved = useRef<{ id: string; data: ProductData; customName: string } | null>(null);
  const switching = useRef(false);
  const enqueue = <T,>(operation: () => Promise<T>) => { const next = queue.current.catch(() => undefined).then(operation); queue.current = next.catch(() => undefined); return next; };
  const metaFor = (meta: ProjectMeta, data: ProductData): ProjectMeta => ({ ...meta, name: projectName(meta, data), updatedAt: Date.now(), imageCount: [data.mainImage, data.thumbnailImage, data.packageImage, data.featureImage, data.point1Image1, data.point1Image2, data.point1Image3, data.point2Image1, data.point2Image2, data.point2Image3, data.sizeImage, data.videoInsertImage, ...data.options.map(option => option.image)].filter(image => Boolean(image && image !== '__ENABLED__')).length });
  const saveNow = async () => {
    if (timer.current) clearTimeout(timer.current);
    const state = store.getSnapshot(); if (!state.project.id) throw new Error('작업 복구가 끝난 뒤 다시 저장해주세요.');
    const token = ++ticket.current, meta = metaFor(state.project, state.data);
    setStatus('저장 중…'); setError('');
    try {
      await enqueue(() => saveProject(meta, state.data));
      saved.current = { id: meta.id, data: state.data, customName: meta.customName };
      const latest = store.getSnapshot();
      if (token === ticket.current && latest.project.id === meta.id && latest.data === state.data && latest.project.customName === meta.customName) setStatus('저장됨');
    } catch (cause) { if (token === ticket.current) { setStatus('저장 실패'); setError(storageError(cause)); } throw cause; }
  };
  useEffect(() => {
    let cancelled = false;
    void enqueue(async () => {
      try {
        const active = await readActiveProject();
        let record: { meta: ProjectMeta; data: ProductData };
        if (active) record = await readProject(active);
        else {
          let data = structuredClone(INITIAL_PRODUCT_DATA);
          try { const legacy = legacyDocument(); if (legacy) { data = legacy; if (!cancelled) setNotice('이전 임시 저장을 작업 보관함으로 가져왔습니다. 원본 임시 저장은 유지했습니다.'); } } catch { if (!cancelled) setNotice('이전 임시 저장을 읽지 못했습니다. 기존 자료는 그대로 보존했습니다.'); }
          const now = Date.now(), meta = metaFor({ id: crypto.randomUUID(), name: '', customName: '', createdAt: now, updatedAt: now, imageCount: 0 }, data);
          await saveProject(meta, data, true); record = { meta, data };
        }
        if (cancelled) return;
        saved.current = { id: record.meta.id, data: record.data, customName: record.meta.customName };
        store.replaceProject(record.meta, record.data); setStatus('저장됨'); setReady(true);
      } catch (cause) { if (!cancelled) { setError(storageError(cause)); setStatus('복구 실패'); setReady(true); } }
    });
    return () => { cancelled = true; };
  }, [store]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!ready || busy || !snapshot.project.id) return;
    const previous = saved.current;
    if (previous?.id === snapshot.project.id && previous.data === snapshot.data && previous.customName === snapshot.project.customName) return;
    setStatus('저장 대기');
    if (!snapshot.imageGesture) timer.current = setTimeout(() => { void saveNow().catch(() => undefined); }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [ready, busy, snapshot.data, snapshot.project.id, snapshot.project.customName, snapshot.imageGesture]);
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden' && store.getSnapshot().project.id) void saveNow().catch(() => undefined); };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [store]);
  const open = async (id: string) => {
    if (switching.current) throw new Error('다른 상품 작업을 여는 중입니다. 잠시 기다려주세요.');
    switching.current = true;
    setBusy(true); setError('');
    try {
      if (store.getSnapshot().project.id) await saveNow();
      const record = await enqueue(() => readProject(id)); await enqueue(() => activateProject(id));
      saved.current = { id, data: record.data, customName: record.meta.customName }; ++ticket.current;
      store.replaceProject(record.meta, record.data); setStatus('저장됨');
    } catch (cause) { setError(storageError(cause)); throw cause; } finally { switching.current = false; setBusy(false); }
  };
  const create = async (data = structuredClone(INITIAL_PRODUCT_DATA), customName = '') => {
    if (switching.current) throw new Error('다른 상품 작업을 여는 중입니다. 잠시 기다려주세요.');
    switching.current = true;
    setBusy(true); setError('');
    try {
      if (store.getSnapshot().project.id) await saveNow();
      const now = Date.now(), meta = metaFor({ id: crypto.randomUUID(), name: '', customName, createdAt: now, updatedAt: now, imageCount: 0 }, data);
      await enqueue(() => saveProject(meta, data, true));
      saved.current = { id: meta.id, data, customName }; ++ticket.current;
      store.replaceProject(meta, data); setStatus('저장됨');
    } catch (cause) { setError(storageError(cause)); throw cause; } finally { switching.current = false; setBusy(false); }
  };
  return { ready, busy, status, error, notice, hasActiveProject: Boolean(snapshot.project.id), saveNow, open, create, list: listProjects, importFile: async (text: string) => { const file = parseProjectFile(text); await create(file.data, file.name); }, title: projectName(snapshot.project, snapshot.data) };
}
