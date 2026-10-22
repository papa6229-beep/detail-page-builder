// Run with the Playwright browser_run_code tool against the local Vite server.
async (page) => {
  page.setDefaultTimeout(5000);
  await page.goto('http://127.0.0.1:3000/');
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=';
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const drop = async (target, files) => {
    return target.evaluate((element, { files, png }) => {
      const transfer = new DataTransfer();
      for (const file of files) {
        const bytes = file.type.startsWith('image/')
          ? Uint8Array.from(atob(png), character => character.charCodeAt(0))
          : new TextEncoder().encode('not an image');
        transfer.items.add(new File([bytes, file.name], file.name, { type: file.type }));
      }
      const send = type => element.dispatchEvent(new DragEvent(type, {
        bubbles: true, cancelable: true, dataTransfer: transfer,
      }));
      send('dragenter');
      send('dragover');
      send('drop');
    }, { files, png });
  };
  const zone = label => page.locator('.builder-upload').filter({ hasText: label }).locator('.builder-upload-zone');
  const waitForImage = async (target, message) => {
    try { await target.waitFor({ state: 'attached', timeout: 2500 }); }
    catch { throw new Error(message); }
    return target.getAttribute('src');
  };

  await zone('Main Image').evaluate(element => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['fixture'], 'hover.png', { type: 'image/png' }));
    element.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  const mainDrop = page.locator('.builder-upload').filter({ hasText: 'Main Image' });
  await page.waitForFunction(() => document.querySelector('.builder-upload.is-dragging') !== null);
  await zone('Main Image').evaluate(element => {
    // Some browsers omit file types while the pointer leaves a drop target.
    element.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(!(await mainDrop.getAttribute('class')).includes('is-dragging'), 'Leaving a drop target must clear its highlight even when file types are absent');
  results.push('Drag-leave clears highlight');

  await drop(zone('Main Image'), [{ name: 'main.png', type: 'image/png' }]);
  const main = page.locator('#preview-main img[alt="Main"]');
  const original = await waitForImage(main, 'FAIL: dropping an image onto Main Image did not update the live preview');
  assert(original.startsWith('data:image/png;base64,'), 'Dropped main image must retain PNG bytes');
  results.push('Main drop updates live preview');

  await drop(zone('Main Image'), [{ name: 'replacement.png', type: 'image/png' }]);
  await page.waitForFunction(previous => document.querySelector('#preview-main img')?.getAttribute('src') !== previous, original);
  const replacement = await main.getAttribute('src');
  assert(replacement !== original, 'Dropping onto an occupied slot must replace its image');
  results.push('Occupied slot replacement');

  await drop(zone('Main Image'), [{ name: 'notes.txt', type: 'text/plain' }]);
  const mainUpload = page.locator('.builder-upload').filter({ hasText: 'Main Image' });
  await mainUpload.getByRole('alert').waitFor({ state: 'visible' });
  assert(await main.getAttribute('src') === replacement, 'Non-image drop must preserve the existing image');
  await drop(zone('Main Image'), [
    { name: 'one.png', type: 'image/png' }, { name: 'two.png', type: 'image/png' },
  ]);
  assert((await mainUpload.getByRole('alert').textContent()).includes('한 장'), 'Multiple files need an explicit single-slot error');
  assert(await main.getAttribute('src') === replacement, 'Multiple files must not silently replace a slot');
  results.push('Invalid and multiple drops preserve existing image');

  await mainUpload.locator('input[type=file]').setInputFiles({
    name: 'picker.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
  });
  await page.waitForFunction(previous => document.querySelector('#preview-main img')?.getAttribute('src') !== previous, replacement);
  assert(await mainUpload.getByRole('alert').count() === 0, 'Valid file-picker upload clears the drop error');
  results.push('Existing file-picker upload');

  await drop(page.locator('.builder-watermark-panel'), [{ name: 'watermark.png', type: 'image/png' }]);
  await waitForImage(page.locator('.builder-watermark-panel img[alt="watermark"]'), 'Watermark drop failed');
  results.push('Watermark drop');

  await page.locator('aside input[type=checkbox]').locator('..').click();
  await drop(zone('Package Image'), [{ name: 'package.png', type: 'image/png' }]);
  await waitForImage(page.locator('#preview-package img[alt="Package"]'), 'Package drop failed');
  results.push('Package drop');

  for (const name of ['+ Feature 섹션 추가하기', '+ Point 01 섹션 추가하기', '+ Point 02 섹션 추가하기']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  for (const prefix of ['point1', 'point2']) {
    for (const number of [2, 3]) {
      await page.getByRole('button', { name: `+ 이미지 (${prefix}-${number})`, exact: true }).click();
    }
  }
  for (const label of ['Feature Image', 'Image 1-1', 'Image 1-2', 'Image 1-3', 'Image 2-1', 'Image 2-2', 'Image 2-3', 'Size Detail', 'Thumbnail', '동영상 삽입 (이미지)']) {
    await drop(zone(label), [{ name: `${label}.png`, type: 'image/png' }]);
    await waitForImage(page.locator('.builder-upload').filter({ hasText: label }).locator(`img[alt="${label}"]`), `${label} drop failed`);
    results.push(`${label} drop`);
  }

  await page.getByRole('button', { name: '+ 추가', exact: true }).click();
  const optionCard = page.locator('aside input[placeholder="옵션명"]').locator('..');
  await drop(optionCard, [{ name: 'option.png', type: 'image/png' }]);
  await waitForImage(optionCard.locator('img[alt="opt"]'), 'Option drop failed');
  await waitForImage(page.locator('#preview-option img'), 'Option drop did not update live preview');
  results.push('Option drop updates live preview');

  await page.reload();
  return { passed: results.length, checks: results };
}
