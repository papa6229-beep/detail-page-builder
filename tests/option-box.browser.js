async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1050 } });
  await context.addInitScript(() => sessionStorage.setItem('builder_editor_open', '1'));
  const p = await context.newPage(); p.setDefaultTimeout(8000);
  try {
    await p.goto('http://127.0.0.1:3000/');
    const saved = () => p.getByRole('status', { name: '자동 저장 상태', exact: true }).filter({ hasText: '저장됨' }).waitFor(); await saved();
    const assert = (value, message) => { if (!value) throw new Error(message); };
    await p.getByRole('button', { name: '+ 추가', exact: true }).click();
    const card = p.locator('#preview-option [data-option-card]').first();
    assert(await card.count() === 1, 'Empty options need a draggable, resizable whole card');
    const name = p.getByPlaceholder('옵션명', { exact: true }); await name.fill('테스트 옵션');
    await card.scrollIntoViewIfNeeded();
    const before = await card.boundingBox();
    await p.mouse.move(before.x + before.width / 2, before.y + before.height / 2); await p.mouse.down(); await p.mouse.move(before.x + before.width / 2 + 50, before.y + before.height / 2 + 25, { steps: 5 }); await p.mouse.up();
    const moved = await card.boundingBox();
    assert(Math.abs(moved.x - before.x - 50) < 3 && Math.abs(moved.y - before.y - 25) < 3, 'Empty option whole-card drag must follow the pointer');
    await p.getByRole('button', { name: '되돌리기', exact: true }).click();
    const undone = await card.boundingBox(); assert(Math.abs(undone.x - before.x) < 2 && await name.inputValue() === '테스트 옵션', 'Card undo must restore position without losing option text');
    await p.getByRole('button', { name: '다시 실행', exact: true }).click();
    const resize = card.locator('[data-option-resize="bottomRight"]'); await resize.scrollIntoViewIfNeeded(); const handle = await resize.boundingBox();
    await p.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await p.mouse.down(); await p.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2 + 30, { steps: 5 }); await p.mouse.up();
    assert((await card.boundingBox()).width > moved.width + 30, `Whole option card must resize, including the text box: ${JSON.stringify({ moved, handle, resized: await card.boundingBox(), hit: await p.evaluate(point => document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 250), { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }) })}`);
    const fixture = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 200; c.getContext('2d').fillRect(20, 20, 120, 160); return c.toDataURL().split(',')[1]; });
    await p.getByRole('group', { name: '옵션 1 이미지 첨부', exact: true }).locator('input[type=file]').setInputFiles({ name: 'option.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
    await card.getByRole('button', { name: '옵션 1 사진 편집', exact: true }).click();
    const move = p.getByRole('button', { name: '옵션 테스트 옵션 이미지 이동', exact: true }); await move.click();
    await p.getByRole('button', { name: '옵션 테스트 옵션 이미지 회전', exact: true }).focus(); await p.keyboard.press('ArrowRight');
    assert(await card.locator('img').getAttribute('data-image-angle') === '1', 'Explicit photo mode must retain image-only controls');
    await p.screenshot({ path: 'C:/Users/BNN/Documents/ChatGPT/detail_builder/option-photo-mode.png' });
    await p.getByRole('button', { name: '옵션 1 박스 편집', exact: true }).click();
    assert(await move.count() === 0, 'Card mode must remove photo hit areas that intercept dragging');
    await saved(); const size = await card.evaluate(e => ({ width: e.offsetWidth, height: e.offsetHeight }));
    await p.reload(); await saved();
    const restored = await card.evaluate(e => ({ width: e.offsetWidth, height: e.offsetHeight }));
    assert(JSON.stringify(size) === JSON.stringify(restored) && await card.locator('img').getAttribute('data-image-angle') === '1', 'Saved card and image layouts must both survive reload');
    await p.getByRole('button', { name: '+ 추가', exact: true }).click();
    const positions = await p.locator('[data-option-card]').evaluateAll(items => items.map(e => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom, sectionBottom: e.closest('#preview-option').getBoundingClientRect().bottom })));
    assert(positions[1].top >= positions[0].bottom + 30, `New options must follow the previous card without overlap: ${JSON.stringify(positions)}`);
    assert(positions.every(position => position.bottom <= position.sectionBottom), 'Option cards must remain inside their section after adding another option');
    await card.scrollIntoViewIfNeeded(); await p.screenshot({ path: 'C:/Users/BNN/Documents/ChatGPT/detail_builder/option-box-editing.png' });
    return { passed: 9 };
  } finally { await context.close(); }
}
