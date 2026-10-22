// Run with the Playwright browser_run_code tool against the local Vite server.
async (page) => {
  page.setDefaultTimeout(5000);
  await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const handle = page.getByRole('separator', { name: '메인 이미지 아래 간격', exact: true });
  assert(await handle.count() === 1, 'FAIL: the main section needs a mouse-draggable spacing handle');
  assert(await handle.getAttribute('aria-valuenow') === '64', 'Existing main spacing must default to 64px');
  const padding = () => page.locator('#preview-top').evaluate(e => Number.parseFloat(getComputedStyle(e).paddingBottom));
  const drag = async (target, dy) => {
    await target.scrollIntoViewIfNeeded();
    const rect = await target.boundingBox();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + dy, { steps: 6 });
    await page.mouse.up();
  };

  const originalHeight = await page.locator('#preview-top').evaluate(e => e.offsetHeight);
  await drag(handle, 48);
  assert(await padding() === 112, 'Dragging down 48px must increase the existing 64px gap to 112px');
  assert(await page.locator('#preview-top').evaluate(e => e.offsetHeight) === originalHeight + 48, 'The next section must move by the exact drag distance');
  assert(await page.locator('#preview-spec').evaluate(e => getComputedStyle(e).paddingBottom) === '80px', 'Changing main spacing must not alter spec spacing');
  await drag(handle, -32);
  assert(await padding() === 80, 'Dragging up must reduce the gap');
  await handle.press('Home');
  assert(await padding() === 0, 'The gap can be reduced to zero');
  await handle.press('ArrowUp');
  assert(await padding() === 0, 'The gap must not become negative');
  await handle.dblclick();
  assert(await padding() === 64, 'Double-click must restore the original gap');

  await drag(handle, 36);
  const originalSave = await page.evaluate(() => localStorage.getItem('builder_temp_save'));
  try {
    await page.getByRole('button', { name: '임시 저장', exact: true }).click();
    await page.waitForFunction(() => Boolean(localStorage.getItem('builder_temp_save')));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('builder_temp_save')));
    assert(saved.sectionSpacing.main === 100, 'Adjusted spacing must be included in the existing temporary save');
    await page.reload();
    await page.getByRole('status', { name: '자동 저장 상태', exact: true }).filter({ hasText: '저장됨' }).waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#preview-top')).paddingBottom === '100px');
    assert(await padding() === 100, 'Loading a saved product must restore its section spacing');
    await page.evaluate(() => {
      const legacy = JSON.parse(localStorage.getItem('builder_temp_save'));
      delete legacy.sectionSpacing;
      localStorage.setItem('builder_temp_save', JSON.stringify(legacy));
    });
    await page.getByRole('button', { name: '불러오기', exact: true }).click();
    const library = page.getByRole('dialog', { name: '작업 보관함', exact: true });
    await library.getByRole('button', { name: '이전 임시 저장 불러오기', exact: true }).click();
    await library.waitFor({ state: 'detached' });
    assert(await padding() === 64, 'Loading an older save without spacing must reset the previous product gap to its original default');
  } finally {
    await page.evaluate(original => {
      if (original === null) localStorage.removeItem('builder_temp_save');
      else localStorage.setItem('builder_temp_save', original);
    }, originalSave);
  }
  await page.reload();
  const boundary = await page.locator('#preview-top').evaluate(e => {
    const container = document.querySelector('#detail-page-container');
    return Math.round(e.getBoundingClientRect().bottom - container.getBoundingClientRect().top);
  });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '전체 이미지 저장', exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const jpeg = Buffer.concat(chunks);
  const exportResult = await page.evaluate(async ({ base64, boundary }) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = 24;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, boundary - 12, image.width, 24, 0, 0, image.width, 24);
    const pixels = context.getImageData(0, 0, image.width, 24).data;
    let goldPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 140 && pixels[i + 1] > 105 && pixels[i] - pixels[i + 2] > 35 && pixels[i + 1] - pixels[i + 2] > 20) goldPixels++;
    }
    return { width: image.width, goldPixels };
  }, { base64: jpeg.toString('base64'), boundary });
  assert(exportResult.width === 800, 'Spacing controls must not change export width');
  assert(exportResult.goldPixels < 5, 'Editor spacing handles must be excluded from the actual downloaded JPG');

  await page.locator('aside input[type=checkbox]').locator('..').click();
  await page.getByRole('button', { name: '+ 추가', exact: true }).click();
  for (const name of ['+ Feature 섹션 추가하기', '+ Point 01 섹션 추가하기', '+ Point 02 섹션 추가하기']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64');
  for (const label of ['Size Detail', '동영상 삽입 (이미지)']) {
    await page.locator('.builder-upload').filter({ hasText: label }).locator('input[type=file]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: png });
  }
  await page.waitForFunction(() => document.querySelectorAll('[data-spacing-key]').length === 10);
  for (const key of ['package', 'options', 'feature', 'point1', 'point2', 'size', 'video', 'summary', 'spec']) {
    const control = page.locator(`[data-spacing-key="${key}"]`);
    const previous = Number(await control.getAttribute('aria-valuenow'));
    await control.press('ArrowDown');
    assert(Number(await control.getAttribute('aria-valuenow')) === previous + 4, `${key} spacing must be independently adjustable`);
  }
  for (const [key, section] of [['package', '#preview-package'], ['options', '#preview-option']]) {
    const before = await page.locator(section).evaluate(e => e.offsetHeight);
    await drag(page.locator(`[data-spacing-key="${key}"]`), 24);
    assert(await page.locator(section).evaluate(e => e.offsetHeight) === before + 24, `${key} reserved image area must resize by the exact gap change`);
  }
  const imageBefore = await page.locator('#preview-size img[alt="Size Detail"]').getAttribute('src');
  const sizeHandle = page.locator('[data-spacing-key="size"]');
  await sizeHandle.press('End');
  await sizeHandle.press('ArrowDown');
  assert(await sizeHandle.getAttribute('aria-valuenow') === '600', 'Very large spacing must be clamped at 600px');
  assert(await page.locator('#preview-size img[alt="Size Detail"]').getAttribute('src') === imageBefore, 'Spacing edits must preserve image bytes');
  await page.reload();
  return {
    passed: 17,
    checks: ['Default spacing', 'Drag down', 'Exact layout displacement', 'Independent sections', 'Drag up', 'Zero lower bound', 'Double-click reset', 'Temporary save', 'Restore', 'Older-save compatibility', '800px export', 'No editor handles in exported JPG', 'All 10 section controls', 'Independent optional section values', 'Package and option area resize', '600px upper bound', 'Original image preserved'],
    exportResult,
  };
}
