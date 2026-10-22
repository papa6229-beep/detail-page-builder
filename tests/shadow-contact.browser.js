async (page) => {
  const probe = await page.context().newPage();
  try {
    await probe.goto('http://127.0.0.1:3001/image-lab.html');
    return await probe.evaluate(async () => {
      const { finishImage } = await import('/lab/finishImage.ts');
      const { DEFAULT_SHADOW } = await import('/lab/shadow.ts');
      const c = new OffscreenCanvas(640, 320), x = c.getContext('2d');
      // A body lifted slightly above the lowest base: the contact must follow its underside.
      x.fillStyle = '#905949'; x.fillRect(100, 180, 300, 45); x.fillRect(430, 110, 70, 140);
      const input = await c.convertToBlob(), source = x.getImageData(0, 0, 640, 320).data;
      const image = await createImageBitmap(await finishImage(input, 0, DEFAULT_SHADOW));
      x.clearRect(0, 0, 640, 320); x.drawImage(image, 0, 0); image.close();
      const result = x.getImageData(0, 0, 640, 320).data;
      const peak = (l, t, r, b) => { let value = 0; for (let y = t; y < b; y++) for (let p = l; p < r; p++) value = Math.max(value, result[(y * 640 + p) * 4 + 3]); return value; };
      const contact = peak(150, 225, 350, 229), below = peak(150, 234, 350, 238);
      if (contact < 20) throw new Error(`Contact must visibly meet the body's underside, alpha ${contact}/255`);
      if (contact <= below) throw new Error(`The contact edge must be stronger than the detached floor haze: ${contact} <= ${below}`);
      let changed = 0;
      for (let i = 0; i < source.length; i += 4) if (source[i + 3] === 255 && [0, 1, 2, 3].some(k => source[i + k] !== result[i + k])) changed++;
      if (changed) throw new Error('Contact shadows must preserve opaque product pixels');
      return { passed: 3, contact, below, changed };
    });
  } finally { await probe.close(); }
}
