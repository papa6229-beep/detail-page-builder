async (page) => {
  page.setDefaultTimeout(8000); await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const zone = page.getByRole('group', { name: '동영상 삽입 (이미지) 이미지 첨부', exact: true });
  const fixture = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#ba3054'; x.fillRect(40, 25, 240, 150); return c.toDataURL().split(',')[1]; });
  const readZip = bytes => {
    let end = bytes.length - 22; while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--;
    assert(end >= 0, 'Download must be a ZIP');
    const count = bytes.readUInt16LE(end + 10), entries = new Map(); let offset = bytes.readUInt32LE(end + 16);
    for (let i = 0; i < count; i++) {
      assert(bytes.readUInt32LE(offset) === 0x02014b50, 'ZIP central directory must be valid');
      const nameLength = bytes.readUInt16LE(offset + 28), extra = bytes.readUInt16LE(offset + 30), comment = bytes.readUInt16LE(offset + 32);
      const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString();
      const local = bytes.readUInt32LE(offset + 42), size = bytes.readUInt32LE(offset + 20), method = bytes.readUInt16LE(offset + 10);
      assert(method === 0, 'Existing export stores files without ZIP recompression');
      const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
      entries.set(name, bytes.subarray(start, start + size)); offset += 46 + nameLength + extra + comment;
    }
    return entries;
  };
  const download = async () => {
    const event = page.waitForEvent('download'); await page.getByRole('button', { name: '전체 이미지 저장', exact: true }).click();
    const file = await event, stream = await file.createReadStream(), chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return readZip(Buffer.concat(chunks));
  };
  await zone.locator('input[type=file]').setInputFiles({ name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
  const move = page.getByRole('button', { name: '삽입 이미지 이동', exact: true }); await move.scrollIntoViewIfNeeded(); await move.click();
  await page.getByRole('button', { name: '삽입 이미지 회전', exact: true }).focus(); await page.keyboard.press('Shift+ArrowRight');
  const still = await download();
  assert(still.has('main1.jpg') && still.has('main2.jpg') && still.has('main3.jpg') && !still.has('main2.gif'), 'Edited still insert must export the visible JPEG result, not mislabeled source bytes');
  const middle = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const size = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return size;
  }, still.get('main2.jpg').toString('base64'));
  assert(middle.width === 800 && middle.height >= 450, 'Middle JPEG must preserve the actual insert area width and height');
  const gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  await zone.locator('input[type=file]').setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: Buffer.from(gif, 'base64') });
  await page.waitForFunction(() => document.querySelector('#video-insert-section img')?.src.startsWith('data:image/gif'));
  assert(await page.getByRole('button', { name: '삽입 이미지 이동', exact: true }).count() === 0, 'GIF inserts must retain the original-animation path');
  const animated = await download();
  assert(animated.has('main2.gif') && animated.get('main2.gif').equals(Buffer.from(gif, 'base64')), 'Animated GIF source bytes must remain exactly unchanged');
  return { passed: 4, still: middle, gifBytesPreserved: true };
}
