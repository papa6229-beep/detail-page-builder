async (page) => {
  try {
  page.setDefaultTimeout(8000); await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#ba3054'; x.fillRect(50, 50, 300, 200); return c.toDataURL().split(',')[1]; });
  const upload = async label => page.getByRole('group', { name: `${label} 이미지 첨부`, exact: true }).locator('input[type=file]').setInputFiles({ name: 'preview.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  await upload('Main Image'); await upload('Size Detail');
  const main = page.locator('#preview-main img[alt="Main"]'), source = await main.getAttribute('src');
  const move = page.getByRole('button', { name: '메인 이미지 이동', exact: true });
  assert(await move.count() === 1, 'Placed main image must be editable without running product fit first');
  const height = await page.locator('#preview-main').evaluate(e => e.clientHeight);
  await move.scrollIntoViewIfNeeded(); let box = await move.boundingBox();
  const beforeDrag = await main.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 16, { steps: 3 }); await page.mouse.up();
  assert(Number(await main.getAttribute('data-image-x')) > 0 && Number(await main.getAttribute('data-image-y')) > 0, 'Dragging must update only the selected image placement');
  const afterDrag = await main.boundingBox();
  assert(Math.abs(afterDrag.x - beforeDrag.x - 24) < 2 && Math.abs(afterDrag.y - beforeDrag.y - 16) < 2, 'Selecting the image must not shift the canvas or add a jump to the pointer movement');
  const rotation = page.getByRole('button', { name: '메인 이미지 회전', exact: true });
  const rot = await rotation.boundingBox(), selection = await page.locator('[data-image-selection="mainImage"]').boundingBox();
  const center = { x: selection.x + selection.width / 2, y: selection.y + selection.height / 2 };
  const start = { x: rot.x + rot.width / 2, y: rot.y + rot.height / 2 };
  const angle = Math.atan2(start.y - center.y, start.x - center.x) + Math.PI / 6, radius = Math.hypot(start.x - center.x, start.y - center.y);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, { steps: 3 });
  await page.waitForFunction(() => Number(document.querySelector('#preview-main img').dataset.imageAngle) > 15); await page.mouse.up();
  const resize = page.getByRole('button', { name: '메인 이미지 크기 조절', exact: true }); box = await resize.boundingBox();
  const end = { x: center.x + (box.x + box.width / 2 - center.x) * .8, y: center.y + (box.y + box.height / 2 - center.y) * .8 };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 3 }); await page.mouse.up();
  assert(Number(await main.getAttribute('data-image-scale')) < 1 && await main.getAttribute('src') === source && await page.locator('#preview-main').evaluate(e => e.clientHeight) === height, 'Resize must preserve image bytes and section height');
  const thumbMove = page.getByRole('button', { name: '썸네일 500 이미지 이동', exact: true });
  await thumbMove.scrollIntoViewIfNeeded(); await thumbMove.click(); await page.getByRole('button', { name: '썸네일 500 이미지 회전', exact: true }).focus(); await page.keyboard.press('Shift+ArrowRight');
  const angles = await page.locator('.builder-thumbnails img[alt="Thumbnail"]').evaluateAll(images => images.map(img => img.dataset.imageAngle));
  assert(angles.length === 4 && angles.every(angle => angle === '5') && Number(await main.getAttribute('data-image-angle')) > 15, 'Thumbnail changes must sync all presets and remain independent from main');
  await page.getByRole('button', { name: '사이즈 이미지 이동', exact: true }).scrollIntoViewIfNeeded(); await page.getByRole('button', { name: '사이즈 이미지 이동', exact: true }).click();
  await page.getByRole('button', { name: '사이즈 이미지 회전', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  assert(await page.locator('#preview-size img[alt="Size Detail"]').getAttribute('data-image-angle') === '1', 'Detail-section pictures must support the same controls');
  await page.getByRole('button', { name: '사이즈 이미지 배치 초기화', exact: true }).click();
  assert(await page.locator('#preview-size img[alt="Size Detail"]').getAttribute('data-image-angle') === '0', 'Reset must restore only that picture');
  const downloadEvent = page.waitForEvent('download');
  await thumbMove.scrollIntoViewIfNeeded(); await thumbMove.click();
  await page.locator('.builder-thumbnails').getByRole('button', { name: '다운로드', exact: true }).nth(2).click();
  const download = await downloadEvent, stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height; const x = c.getContext('2d'); x.drawImage(bitmap, 0, 0); bitmap.close();
    const data = x.getImageData(0, 0, c.width, c.height).data;
    let count = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, gold = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 180 && g > 150 && g < 225 && b > 70 && b < 165 && g - b > 20) gold++;
      if (r > 140 && g < 100 && b > 40 && b < 150) { count++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
    }
    const angle = Math.atan2(2 * (sxy / count - sx * sy / count ** 2), (sxx / count - (sx / count) ** 2) - (syy / count - (sy / count) ** 2)) * 90 / Math.PI;
    return { width: c.width, height: c.height, gold, angle };
  }, Buffer.concat(chunks).toString('base64'));
  assert(exported.width === 500 && exported.height === 500 && exported.gold === 0 && Math.abs(exported.angle - 5) < 1, 'Saved JPG must include the actual rotation and exclude editing controls');
  await page.getByRole('button', { name: '임시 저장', exact: true }).click();
  await page.waitForFunction(() => Boolean(localStorage.getItem('builder_temp_save')));
  await page.reload(); await page.getByRole('status', { name: '자동 저장 상태', exact: true }).filter({ hasText: '저장됨' }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector('#preview-main img')?.dataset.imageAngle) > 15);
  assert(await main.getAttribute('src') === source && Number(await main.getAttribute('data-image-scale')) < 1, 'Saved transforms must survive reloading without changing the source');
  await page.getByRole('button', { name: '메인 이미지 이동', exact: true }).scrollIntoViewIfNeeded(); await page.getByRole('button', { name: '메인 이미지 이동', exact: true }).click();
  await page.getByRole('button', { name: '선택 이미지 초기화', exact: true }).click();
  assert(await main.getAttribute('data-image-angle') === '0' && (await page.locator('.builder-thumbnails img[alt="Thumbnail"]').first().getAttribute('data-image-angle')) === '5', 'Global reset must restore only the selected picture');
  const result = { passed: 9, exported };
  await page.evaluate(result => { window.__previewImageVerification = result; }, result); return result;
  } catch (error) { await page.evaluate(message => { window.__previewImageVerification = { error: message }; }, error.message); throw error; }
}
