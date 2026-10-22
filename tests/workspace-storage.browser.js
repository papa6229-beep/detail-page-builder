async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
  const p = await context.newPage(); p.setDefaultTimeout(8000);
  try {
    await p.addInitScript(() => { if (!localStorage.getItem('builder_temp_save')) localStorage.setItem('builder_temp_save', JSON.stringify({ productNameKr: '이전 작업', brandName: '기존 브랜드', summaryInfo: {}, options: [] })); });
    await p.goto('http://127.0.0.1:3000/');
    await p.getByRole('button', { name: '편집 이어하기', exact: true }).click();
    const name = p.getByPlaceholder('예: 바나나 오나홀', { exact: true }), brand = p.getByPlaceholder('예: BANANA MALL', { exact: true });
    const status = p.getByRole('status', { name: '자동 저장 상태', exact: true });
    const assert = (value, message) => { if (!value) throw new Error(message); };
    assert(await name.inputValue() === '이전 작업' && await brand.inputValue() === '기존 브랜드', 'Legacy temporary save must migrate without loss');
    assert(await p.evaluate(() => JSON.parse(localStorage.getItem('builder_temp_save')).productNameKr) === '이전 작업', 'Migration must preserve the legacy save');
    const validation = await p.evaluate(async () => {
      const { normaliseDocument } = await import('/projectStorage.ts');
      const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
      const invalid = [{ watermarkSettings: [] }, { isFeatureEnabled: 'yes' }, { previewImageTransforms: { mainImage: { x: 'wrong', y: 0, scale: 1, angle: 0 } } }, { imageEdits: { mainImage: { original: 123, tone: 45, shadow: {} } } }, { imageEdits: { mainImage: { original: 'data:image/png;base64,fixture', tone: 45, shadow: { opacity: { invalid: true } } } } }];
      return invalid.map(change => { try { normaliseDocument({ ...INITIAL_PRODUCT_DATA, ...change }); return false; } catch { return true; } });
    });
    assert(validation.every(Boolean), 'Malformed nested project fields must be rejected before replacing a document');
    const atomic = await p.evaluate(async () => {
      const { readActiveProject, readProject, saveProject } = await import('/projectStorage.ts');
      const id = await readActiveProject(), before = await readProject(id), original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) { if (this.name === 'documents') throw new DOMException('Fixture write rejected', 'QuotaExceededError'); return original.apply(this, args); };
      try { await saveProject({ ...before.meta, name: '수정되면 안 되는 제목' }, { ...before.data, brandName: '수정되면 안 되는 문서' }); } catch {} finally { IDBObjectStore.prototype.put = original; }
      const after = await readProject(id); return after.meta.name === before.meta.name && after.data.brandName === before.data.brandName;
    });
    assert(atomic, 'A synchronous document write failure must also roll back its queued header write');
    await p.evaluate(() => { window.__originalPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('Fixture storage full', 'QuotaExceededError'); }; });
    await brand.fill('저장 실패해도 남는 편집');
    await status.filter({ hasText: '저장 실패' }).waitFor();
    assert(await brand.inputValue() === '저장 실패해도 남는 편집', 'Save failure must preserve current edits');
    const persisted = await p.evaluate(async () => { const { readActiveProject, readProject } = await import('/projectStorage.ts'); return (await readProject(await readActiveProject())).data.brandName; });
    assert(persisted === '기존 브랜드', 'Failed transaction must preserve the previous saved document');
    await p.getByRole('button', { name: '불러오기', exact: true }).click();
    const library = p.getByRole('dialog', { name: '작업 보관함', exact: true });
    await library.getByRole('alert').waitFor();
    const download = p.waitForEvent('download'); await library.getByRole('button', { name: '작업 파일 내려받기', exact: true }).click();
    const stream = await (await download).createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
    assert(JSON.parse(Buffer.concat(chunks).toString('utf8')).data.brandName === '저장 실패해도 남는 편집', 'File export must remain available when browser storage fails');
    await library.getByRole('button', { name: '새 상품 작업', exact: true }).click();
    await library.getByRole('alert').waitFor();
    assert(await brand.inputValue() === '저장 실패해도 남는 편집', 'Failed project switch must keep current work');
    await library.getByRole('button', { name: '보관함 닫기', exact: true }).click();
    await p.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut; });
    await p.getByRole('button', { name: '임시 저장', exact: true }).click(); await status.filter({ hasText: '저장됨' }).waitFor();
    await p.reload(); await status.filter({ hasText: '저장됨' }).waitFor();
    assert(await brand.inputValue() === '저장 실패해도 남는 편집', 'Retrying storage must save and restore the latest document');
    const damagedId = await p.evaluate(async () => {
      const { readActiveProject, saveProject } = await import('/projectStorage.ts');
      const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
      const id = await readActiveProject(), now = Date.now();
      await saveProject({ id: 'healthy-fixture', name: '정상 보관 작업', customName: '', createdAt: now, updatedAt: now, imageCount: 0 }, { ...INITIAL_PRODUCT_DATA, productNameKr: '정상 보관 작업' });
      const db = await new Promise((resolve, reject) => { const req = indexedDB.open('detail-page-builder-workspace', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
      await new Promise((resolve, reject) => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').put({ id, data: { damagedFixture: true } }); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close(); return id;
    });
    await p.reload();
    const home = p.getByRole('main', { name: '빌더 작업 홈', exact: true });
    await home.waitFor(); await p.getByRole('alert').waitFor();
    assert(await name.count() === 0, 'Failed startup must not expose a blank unsaved editor');
    await home.getByRole('button').filter({ hasText: '정상 보관 작업' }).click();
    await name.waitFor(); assert(await name.inputValue() === '정상 보관 작업', 'Healthy projects must remain accessible after active-document recovery fails');
    const untouched = await p.evaluate(async id => { const db = await new Promise(resolve => { const req = indexedDB.open('detail-page-builder-workspace', 1); req.onsuccess = () => resolve(req.result); }); const value = await new Promise(resolve => { const req = db.transaction('documents').objectStore('documents').get(id); req.onsuccess = () => resolve(req.result); }); db.close(); return value.data.damagedFixture; }, damagedId);
    assert(untouched === true, 'Recovery navigation must not overwrite an unreadable saved document');
    return { passed: 13, validation };
  } finally { await context.close(); }
}
