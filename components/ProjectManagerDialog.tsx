import { useEffect, useRef, useState } from 'react';
import { BuilderDocumentStore, type ProjectMeta } from '../documentStore';
import { legacyDocument, storageError } from '../projectStorage';
import type { useProjectWorkspace } from '../useProjectWorkspace';

export default function ProjectManagerDialog({ store, workspace, onClose, onSelect }: {
  store: BuilderDocumentStore; workspace: ReturnType<typeof useProjectWorkspace>; onClose: () => void; onSelect: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [working, setWorking] = useState(false);
  const current = store.getSnapshot(), disabled = working || workspace.busy;
  useEffect(() => {
    const element = dialog.current, focus = document.activeElement as HTMLElement | null;
    element?.showModal(); let cancelled = false;
    void (async () => {
      try { if (store.getSnapshot().project.id) await workspace.saveNow(); }
      catch (cause) { if (!cancelled) setError(storageError(cause)); }
      try { const items = await workspace.list(); if (!cancelled) setProjects(items); }
      catch (cause) { if (!cancelled) setError(storageError(cause)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; element?.close(); focus?.focus({ preventScroll: true }); };
  }, [store]);
  const perform = async (operation: () => Promise<void>) => {
    if (disabled) return;
    setWorking(true); setError('');
    try { await operation(); onSelect(); onClose(); }
    catch (cause) { setError(storageError(cause)); }
    finally { setWorking(false); }
  };
  const download = () => {
    const latest = store.getSnapshot();
    const text = JSON.stringify({ format: 'detail-page-builder-project', version: 1, name: workspace.title, data: latest.data });
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `${workspace.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'product'}.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <dialog ref={dialog} className="builder-review-dialog builder-project-dialog" aria-label="작업 보관함" onCancel={event => { if (disabled) event.preventDefault(); else onClose(); }}>
    <div className="builder-review-header"><div><h2>작업 보관함</h2><p>사진과 문구, 편집한 배치를 상품별로 이어서 작업하세요.</p></div><button type="button" className="builder-button" disabled={disabled} onClick={onClose}>보관함 닫기</button></div>
    <div className="builder-review-body">
      <div className="builder-project-current"><label htmlFor="project-name">현재 작업 이름</label><input id="project-name" value={current.project.customName} placeholder={current.data.productNameKr || '상품명을 입력하면 작업 이름이 됩니다'} onChange={event => store.rename(event.target.value)} disabled={disabled || !workspace.hasActiveProject}/><span>{workspace.status}</span></div>
      <div className="builder-project-actions"><button type="button" className="builder-button builder-button-primary" disabled={disabled || loading} onClick={() => void perform(() => workspace.create())}>새 상품 작업</button><button type="button" className="builder-button" onClick={download} disabled={disabled}>작업 파일 내려받기</button><label className={`builder-button builder-project-import ${disabled ? 'disabled' : ''}`}>작업 파일 가져오기<input type="file" accept="application/json,.json" aria-label="작업 파일 가져오기" disabled={disabled} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void perform(async () => workspace.importFile(await file.text())); }}/></label></div>
      {error && <p className="builder-review-error" role="alert">{error}</p>}
      {loading ? <p className="builder-review-empty" role="status">보관한 작업을 불러오는 중…</p> : <div className="builder-project-list">{projects.map(project => <div key={project.id} data-project-row className={`builder-project-row ${project.id === current.project.id ? 'current' : ''}`}><div><strong>{project.id === current.project.id ? workspace.title : project.name}</strong><p>{new Date(project.updatedAt).toLocaleString('ko-KR')} · 사진 {project.imageCount}장 {project.id === current.project.id && <span>· 현재 작업</span>}</p></div><button type="button" className="builder-button" disabled={disabled} onClick={() => void perform(() => workspace.open(project.id))}>열기</button></div>)}</div>}
      <button type="button" className="builder-project-legacy" disabled={disabled || loading} onClick={() => void perform(async () => { const legacy = legacyDocument(); if (!legacy) throw new Error('이전에 임시 저장한 작업이 없습니다.'); await workspace.create(legacy); })}>이전 임시 저장 불러오기</button>
    </div>
    <div className="builder-review-footer"><span>이 브라우저에 저장됩니다. 다른 PC로 옮길 때는 작업 파일을 내려받으세요.</span></div>
  </dialog>;
}
