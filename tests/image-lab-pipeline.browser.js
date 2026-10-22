async (page) => {
  page.setDefaultTimeout(8000);
  await page.goto('http://127.0.0.1:3001/image-lab.html');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 400;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e2e4e5'; ctx.fillRect(0, 0, 320, 400);
    ctx.fillStyle = '#ba3054'; ctx.beginPath(); ctx.roundRect(105, 65, 110, 260, 45); ctx.fill();
    ctx.fillStyle = '#e9a7b6'; ctx.beginPath(); ctx.ellipse(137, 130, 14, 42, 0, 0, Math.PI * 2); ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'pipeline-check.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  await page.getByRole('button', { name: '테스트 실행', exact: true }).click();
  await page.waitForFunction(() => Boolean(document.querySelector('a[download$="_finished.png"]')) || Boolean(document.querySelector('[role=alert]')), null, { timeout: 60000 });
  assert(await page.getByRole('alert').count() === 0, 'Real background-removal model must finish without an error');
  const pixels = await page.evaluate(() => {
    const read = alt => {
      const image = document.querySelector(`img[alt="${alt}"]`) || document.querySelector(`canvas[aria-label="${alt}"]`);
      const c = document.createElement('canvas'); c.width = image.naturalWidth || image.width; c.height = image.naturalHeight || image.height;
      const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    };
    const source = read('원본'), cutout = read('누끼 결과'), finished = read('톤·그림자 적용');
    let transparent = 0, opaque = 0, changedOpaqueRgb = 0;
    for (let i = 0; i < cutout.data.length; i += 4) {
      if (cutout.data[i + 3] === 0) transparent++;
      if (cutout.data[i + 3] >= 250) {
        opaque++;
        if ([0, 1, 2].some(channel => Math.abs(cutout.data[i + channel] - source.data[i + channel]) > 2)) changedOpaqueRgb++;
      }
    }
    return { source: [source.width, source.height], cutout: [cutout.width, cutout.height], finished: [finished.width, finished.height], transparent, opaque, changedOpaqueRgb };
  });
  assert(JSON.stringify(pixels.cutout) === '[320,400]' && JSON.stringify(pixels.finished) === '[320,400]', 'Original dimensions and aspect ratio must be retained');
  assert(pixels.transparent > 500 && pixels.opaque > 500, 'The model must actually separate foreground from background');
  assert(pixels.changedOpaqueRgb === 0, 'Background removal must preserve near-opaque foreground RGB within PNG alpha-rounding tolerance');
  const firstTime = await page.locator('article footer').nth(1).textContent();
  const cutoutUrl = await page.locator('img[alt="누끼 결과"]').getAttribute('src');
  const waitForFinish = async previous => {
    await page.waitForFunction(previous => {
      const link = document.querySelector('a[download$="_finished.png"]');
      return link && link.href !== previous && document.querySelector('[role=status]').textContent.startsWith('처리 완료');
    }, previous);
  };
  for (const [label, value] of [['그림자 진하기', '70'], ['부드러움', '15']]) {
    const previous = await page.locator('a[download$="_finished.png"]').getAttribute('href');
    await page.getByRole('slider', { name: label, exact: true }).fill(value);
    await waitForFinish(previous);
    assert(await page.getByRole('slider', { name: label, exact: true }).inputValue() === value, `${label} must retain its adjustment`);
  }
  assert(await page.locator('img[alt="누끼 결과"]').getAttribute('src') === cutoutUrl && await page.locator('article footer').nth(1).textContent() === firstTime, 'Shadow adjustments must reuse the same cutout without rerunning removal');
  const beforeReset = await page.locator('a[download$="_finished.png"]').getAttribute('href');
  await page.getByRole('button', { name: '그림자 기본값', exact: true }).click();
  await waitForFinish(beforeReset);
  for (const [label, value] of [['그림자 진하기', '45'], ['부드러움', '6']]) {
    assert(await page.getByRole('slider', { name: label, exact: true }).inputValue() === value, 'Reset must restore every shadow setting');
  }
  const previousUrl = await page.locator('a[download$="_finished.png"]').getAttribute('href');
  await page.getByRole('checkbox', { name: '그림자 적용', exact: true }).uncheck();
  assert(await page.locator('.shadow-sliders input:disabled').count() === 2, 'Disabled shadow controls must reflect the off state');
  await page.getByRole('slider', { name: '톤 보정 강도', exact: true }).fill('0');
  await waitForFinish(previousUrl);
  await page.getByRole('checkbox', { name: '원본 크기(100%)', exact: true }).check();
  assert(await page.locator('.image-stage.native-size').count() === 3, '100% inspection must apply to all comparison panels');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'PNG 저장 ↗', exact: true }).last().click();
  const download = await downloadEvent;
  const stream = await download.createReadStream(); const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const output = Buffer.concat(chunks);
  assert(output.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Downloaded result must be a real PNG');
  await page.getByRole('button', { name: '테스트 실행', exact: true }).click();
  await page.waitForFunction(() => Boolean(document.querySelector('a[download$="_finished.png"]')) || Boolean(document.querySelector('[role=alert]')), null, { timeout: 60000 });
  assert(await page.getByRole('alert').count() === 0, 'Repeated model execution must succeed');
  const repeatedTime = await page.locator('article footer').nth(1).textContent();
  assert(repeatedTime.includes('재실행'), 'Repeated execution must be labelled separately from session initialization');
  return { passed: 12, pixels, firstTime, repeatedTime, filename: download.suggestedFilename(), bytes: output.length };
}
