async (page) => {
  page.setDefaultTimeout(8000); await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#ba3054'; x.fillRect(25, 25, 110, 150); return c.toDataURL().split(',')[1]; });
  const upload = label => page.getByRole('group', { name: `${label} 이미지 첨부`, exact: true }).locator('input[type=file]').setInputFiles({ name: 'layers.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  await upload('Main Image'); await upload('워터마크');
  await page.locator('aside input[type=checkbox]').locator('..').click(); await upload('Package Image');
  await page.getByRole('button', { name: '+ 추가', exact: true }).click(); await upload('옵션 1');
  await page.getByRole('button', { name: '+ Feature 섹션 추가하기', exact: true }).click(); await upload('Feature Image');
  const check = async (label, selector) => {
    const move = page.getByRole('button', { name: `${label} 이동`, exact: true });
    await move.scrollIntoViewIfNeeded(); const button = await move.boundingBox(), image = await page.locator(selector).boundingBox();
    assert(Math.abs(button.x + button.width / 2 - image.x - image.width / 2) < 3 && Math.abs(button.y + button.height / 2 - image.y - image.height / 2) < 3, `${label} hit area must align with the actual placed image`);
    await move.click(); await page.getByRole('button', { name: `${label} 회전`, exact: true }).focus(); await page.keyboard.press('Shift+ArrowRight');
    assert(await page.locator(selector).getAttribute('data-image-angle') === '5', `${label} must rotate independently`);
  };
  await check('패키지 이미지', '#preview-package img[alt="Package"]');
  await page.getByRole('button', { name: '옵션 1 사진 편집', exact: true }).click();
  await check('옵션 1 이미지', '#preview-option img[alt=""]');
  await check('특징 이미지', '#preview-feature img[alt="Feature"]');
  await check('썸네일 500 패키지', '[data-image-canvas="thumbnail-500"] img[alt="Package Overlay"]');
  await page.getByRole('group', { name: 'Main Image 이미지 첨부', exact: true }).getByRole('button', { name: '워터마크 OFF', exact: true }).click();
  await check('메인 워터마크', '#preview-main img[alt="watermark"]');
  const source = await page.locator('#preview-main img[alt="Main"]').getAttribute('src');
  await page.getByRole('button', { name: '메인 이미지 이동', exact: true }).scrollIntoViewIfNeeded();
  assert(await page.locator('#preview-main img[alt="Main"]').getAttribute('src') === source, 'Editing other layers must preserve the source photo');
  return { passed: 6 };
}
