async (page) => {
  page.setDefaultTimeout(8000);
  await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 400;
    const x = c.getContext('2d'); x.fillStyle = '#e2e4e5'; x.fillRect(0, 0, 320, 400);
    x.fillStyle = '#ba3054'; x.beginPath(); x.roundRect(105, 65, 110, 260, 45); x.fill();
    return c.toDataURL().split(',')[1];
  });
  for (const label of ['Main Image', 'Size Detail', 'Thumbnail']) await page.getByRole('group', { name: `${label} 이미지 첨부`, exact: true }).locator('input[type=file]').setInputFiles({ name: 'carry.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  const originalThumb = await page.getByRole('group', { name: 'Thumbnail 이미지 첨부', exact: true }).locator('img').getAttribute('src');
  await page.getByRole('button', { name: '전체 이미지 보정', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '이미지 보정', exact: true });
  const carry = dialog.getByRole('checkbox', { name: '다음 사진에도 이 보정값 사용', exact: true });
  assert(await carry.isChecked(), 'Sequential processing must offer checked setting carry-over');
  const waitReady = () => page.waitForFunction(() => document.querySelector('button[data-image-apply]')?.disabled === false, null, { timeout: 60000 });
  await waitReady();
  await dialog.getByRole('slider', { name: '톤 보정 강도', exact: true }).fill('60');
  await dialog.getByRole('slider', { name: '그림자 진하기', exact: true }).fill('70');
  await dialog.getByRole('slider', { name: '부드러움', exact: true }).fill('12');
  await dialog.getByRole('button', { name: '그림자 회전', exact: true }).focus(); await page.keyboard.press('Shift+ArrowRight');
  await waitReady(); await dialog.getByRole('button', { name: '이 이미지 적용', exact: true }).click();
  await dialog.getByText('2 / 3', { exact: true }).waitFor(); await waitReady();
  assert(await dialog.getByRole('slider', { name: '톤 보정 강도', exact: true }).inputValue() === '60' && await dialog.getByRole('slider', { name: '그림자 진하기', exact: true }).inputValue() === '70' && await dialog.getByRole('slider', { name: '부드러움', exact: true }).inputValue() === '12' && await dialog.locator('canvas').getAttribute('data-angle') === '5', 'Next image must start with the confirmed tone and shadow settings');
  const cutout = await dialog.locator('img[alt="누끼 결과"]').getAttribute('src');
  await carry.uncheck();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await dialog.locator('img[alt="누끼 결과"]').getAttribute('src') === cutout, 'Toggling carry-over must not reset or recalculate the current cutout');
  await dialog.getByRole('slider', { name: '톤 보정 강도', exact: true }).fill('80'); await waitReady();
  await dialog.getByRole('button', { name: '이 이미지 적용', exact: true }).click();
  await dialog.getByText('3 / 3', { exact: true }).waitFor(); await waitReady();
  assert(await dialog.getByRole('slider', { name: '톤 보정 강도', exact: true }).inputValue() === '45' && await dialog.getByRole('slider', { name: '그림자 진하기', exact: true }).inputValue() === '45' && await dialog.locator('canvas').getAttribute('data-angle') === '0', 'Disabling carry-over must use the next photo own settings or defaults');
  assert(await page.getByRole('group', { name: 'Thumbnail 이미지 첨부', exact: true }).locator('img').getAttribute('src') === originalThumb, 'Preparing next settings must not apply an unconfirmed image');
  await dialog.getByRole('button', { name: '편집 닫기', exact: true }).click();
  return { passed: 5 };
}
