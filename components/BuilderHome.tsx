import { useEffect, useState } from 'react';
import type { ProjectMeta } from '../documentStore';
import { storageError } from '../projectStorage';
import type { useProjectWorkspace } from '../useProjectWorkspace';
import { version } from '../package.json';

export default function BuilderHome({ workspace, onStart, onLibrary }: { workspace: ReturnType<typeof useProjectWorkspace>; onStart: () => void; onLibrary: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; if (workspace.ready) void workspace.list().then(items => { if (active) setProjects(items); }).catch(cause => { if (active) setError(storageError(cause)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [workspace.ready]);
  const open = async (id?: string) => { setError(''); try { if (id) await workspace.open(id); else await workspace.create(); onStart(); } catch (cause) { setError(storageError(cause)); } };
  return <main className="builder-home" aria-label="빌더 작업 홈">
    <header className="builder-home-header"><span className="builder-home-brand"><span className="builder-brand-mark">B</span><span>Detail Page Builder</span></span><span>상품 상세페이지 작업실</span></header>
    <section className="builder-home-hero"><div className="builder-home-copy"><h1>Detail Page Builder</h1><p className="builder-home-version">Version {version}</p><div className="builder-home-buttons"><button className="builder-button builder-button-primary" onClick={onStart} disabled={!workspace.ready || workspace.busy || !workspace.hasActiveProject}>{workspace.title === '새 상품' ? '작업 시작하기' : '편집 이어하기'} <span aria-hidden="true">↗</span></button><button className="builder-button" onClick={() => void open()} disabled={!workspace.ready || workspace.busy}>새 상품 작업</button></div><p className="builder-home-resume">마지막 작업 <strong>{workspace.title}</strong><span>{workspace.status}</span></p></div>
    </section>
    <section className="builder-home-recent" aria-label="최근 상품 작업"><div className="builder-home-section-heading"><h2>최근 상품 작업</h2><button className="builder-button" onClick={onLibrary} disabled={!workspace.ready}>작업 보관함 열기</button></div>{error && <p role="alert" className="builder-review-error">{error}</p>}{loading ? <p className="builder-home-empty">작업을 불러오는 중…</p> : <div className="builder-home-projects">{projects.slice(0, 4).map((project, index) => <button className="builder-home-project" key={project.id} onClick={() => void open(project.id)} disabled={workspace.busy}><span className="builder-home-project-number">{String(index + 1).padStart(2, '0')}</span><strong>{project.name}</strong><span>{new Date(project.updatedAt).toLocaleDateString('ko-KR')} · 사진 {project.imageCount}장</span><span className="builder-home-project-open">이어서 편집 ↗</span></button>)}</div>}</section>
    <footer className="builder-home-footer"><span>Detail Page Builder</span><p>작업은 이 브라우저에 자동 저장됩니다. 작업 파일로 별도 보관할 수 있습니다.</p></footer>
  </main>;
}
