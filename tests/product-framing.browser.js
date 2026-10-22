async (page) => {
  page.setDefaultTimeout(8000);
  try {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const main = page.getByRole('group', { name: 'Main Image 이미지 첨부', exact: true });
  const thumb = page.getByRole('group', { name: 'Thumbnail 이미지 첨부', exact: true });
  assert(await main.getByRole('button', { name: '제품 크기 맞춤', exact: true }).count() === 1, 'Main photo needs a one-click product fit control');
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 800;
    const x = c.getContext('2d'); x.fillStyle = '#ba3054'; x.fillRect(700, 500, 100, 160);
    return c.toDataURL().split(',')[1];
  });
  await main.locator('input[type=file]').setInputFiles({ name: 'off-center.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  const source = await main.locator('img').getAttribute('src');
  const oldHeight = await page.locator('#preview-main').evaluate(e => e.clientHeight);
  await main.getByRole('button', { name: '제품 크기 맞춤', exact: true }).click();
  await page.locator('[data-product-framing="main"]').waitFor();
  const read = target => page.locator(`[data-product-framing="${target}"]`).first().evaluate(e => ({ x: Number(e.dataset.productX), y: Number(e.dataset.productY), width: Number(e.dataset.productWidth), height: Number(e.dataset.productHeight), frameWidth: e.clientWidth, frameHeight: e.clientHeight }));
  const fitted = await read('main');
  assert(fitted.width > 300 && Math.abs(fitted.x + fitted.width / 2 - fitted.frameWidth / 2) < 2 && Math.abs(fitted.y + fitted.height / 2 - fitted.frameHeight / 2) < 2, 'Fit must enlarge and center actual product bounds rather than its original blank canvas');
  assert(Math.abs(fitted.width / fitted.height - 100 / 160) < .001 && await page.locator('#preview-main img[alt="Main"]').getAttribute('src') === source, 'Fit must preserve product aspect ratio and source bytes');
  const move = page.getByRole('button', { name: '메인 제품 이동', exact: true });
  await move.scrollIntoViewIfNeeded(); const box = await move.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 4 }); await page.mouse.up();
  let moved = await read('main');
  assert(Math.abs(moved.x - fitted.x - 20) < 2 && Math.abs(moved.y - fitted.y - 20) < 2, 'Dragging must move the product by the actual screen distance');
  const resize = page.getByRole('button', { name: '메인 제품 크기 조절', exact: true });
  await resize.scrollIntoViewIfNeeded(); const corner = await resize.boundingBox();
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2); await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 - 20, corner.y + corner.height / 2 - 20, { steps: 4 }); await page.mouse.up();
  const resized = await read('main');
  assert(resized.width < moved.width && Math.abs(resized.width / resized.height - 100 / 160) < .001, `Corner drag must change size uniformly: ${JSON.stringify({ moved, resized })}`);
  moved = resized;
  await thumb.getByRole('button', { name: '제품 크기 맞춤', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-framing="thumbnail"]').length === 4);
  const thumbnails = await page.locator('[data-product-framing="thumbnail"]').evaluateAll(elements => elements.map(e => ({ height: e.clientHeight, width: e.clientWidth, bottom: Number(e.dataset.productY) + Number(e.dataset.productHeight) })));
  assert(thumbnails.every(item => item.bottom <= item.height - item.width / 500 * 120), 'Every thumbnail must reserve space for the brand text');
  const thumbBefore = await read('thumbnail');
  const thumbMove = page.getByRole('button', { name: '썸네일 500 제품 이동', exact: true });
  await thumbMove.scrollIntoViewIfNeeded(); const thumbBox = await thumbMove.boundingBox();
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2); await page.mouse.down();
  await page.mouse.move(thumbBox.x + thumbBox.width / 2 + 10, thumbBox.y + thumbBox.height / 2, { steps: 4 }); await page.mouse.up();
  const thumbAfter = await read('thumbnail');
  assert(Math.abs(thumbAfter.x - thumbBefore.x - 10) < 1, 'Dragging the scaled 500px thumbnail must move all presets by the correct screen proportion');
  assert(JSON.stringify(await read('main')) === JSON.stringify(moved), 'Thumbnail fit must not change main framing');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('.builder-thumbnails').getByRole('button', { name: '다운로드', exact: true }).nth(2).click();
  const download = await downloadEvent, stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    const x = c.getContext('2d'); x.drawImage(bitmap, 0, 0); bitmap.close();
    const data = x.getImageData(0, 0, c.width, c.height).data; let gold = 0, product = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      if (r > 180 && g > 150 && g < 225 && b > 70 && b < 165 && g - b > 20) gold++;
      if (r > 140 && g < 100 && b > 40 && b < 150) product++;
    }
    return { width: c.width, height: c.height, gold, product };
  }, Buffer.concat(chunks).toString('base64'));
  assert(exported.width === 500 && exported.height === 500 && exported.gold === 0 && exported.product > 20000, 'Saved thumbnail must keep its exact dimensions, fitted product and no editing handles');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.waitForFunction(() => Boolean(localStorage.getItem('builder_temp_save')));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('builder_temp_save')));
  assert(saved.mainImage === source && saved.productFraming.main && saved.productFraming.thumbnail, 'Save must preserve source and both independent placements');
  await page.reload(); await page.getByRole('status', { name: '자동 저장 상태', exact: true }).filter({ hasText: '저장됨' }).waitFor();
  await page.locator('[data-product-framing="main"]').waitFor();
  assert(JSON.stringify(await read('main')) === JSON.stringify(moved), 'Reload must restore the exact framing');
  await main.getByRole('button', { name: '맞춤 해제', exact: true }).click();
  assert(await page.locator('[data-product-framing="main"]').count() === 0 && await page.locator('[data-product-framing="thumbnail"]').count() === 4, 'Reset must affect only the selected placement');
  assert(Math.abs(await page.locator('#preview-main').evaluate(e => e.clientHeight) - oldHeight) < 2, 'Reset must restore the original main photo frame');
  const opaque = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 300); x.fillStyle = '#ba3054'; x.fillRect(100, 100, 100, 100); return c.toDataURL().split(',')[1]; });
  await main.locator('input[type=file]').setInputFiles({ name: 'opaque.png', mimeType: 'image/png', buffer: Buffer.from(opaque, 'base64') });
  await page.waitForFunction(() => document.querySelectorAll('[data-product-framing]').length === 0);
  await main.getByRole('button', { name: '제품 크기 맞춤', exact: true }).click();
  await page.locator('.builder-image-message').filter({ hasText: '투명 여백이 없는 사진입니다. 누끼·보정 후 제품 크기를 맞춰주세요.' }).waitFor();
  const result = { passed: 13, exported };
  await page.evaluate(result => { window.__productFramingVerification = result; }, result); return result;
  } catch (error) { await page.evaluate(message => { window.__productFramingVerification = { error: message }; }, error.message); throw error; }
}
