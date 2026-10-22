async (page) => {
  const p = await page.context().newPage();
  try {
    await p.goto('http://127.0.0.1:3001/image-lab.html');
    return await p.evaluate(async () => {
      const { finishImage } = await import('/lab/finishImage.ts');
      const { curveTable, isValidColorAdjustments, normalizeColorAdjustments } = await import('/lab/colorAdjustments.ts');
      const c = new OffscreenCanvas(256, 2), x = c.getContext('2d');
      const input = x.createImageData(256, 2);
      for (let i = 0; i < 512; i++) { const v = i % 256; input.data.set([v, v, v, v === 255 ? 0 : i < 256 ? 255 : 128], i * 4); }
      x.putImageData(input, 0, 0); const blob = await c.convertToBlob();
      const identity = [0, 64, 128, 192, 255].map(v => ({ x: v, y: v }));
      const color = { levels: { black: 0, white: 255, gamma: 1, outputBlack: 0, outputWhite: 255 }, curves: { rgb: identity, red: identity, green: identity, blue: identity } };
      const read = async value => { const image = await createImageBitmap(await finishImage(blob, 0, false, value)); if (image.width !== 256 || image.height !== 2) throw Error('Color edits must preserve dimensions'); x.clearRect(0, 0, 256, 2); x.drawImage(image, 0, 0); image.close(); return x.getImageData(0, 0, 256, 2).data; };
      const base = await read(color), levels = await read({ ...color, levels: { ...color.levels, black: 32, white: 224 } });
      if (levels[32 * 4] !== 0 || levels[224 * 4] !== 255) throw Error('Input black/white levels must actually remap product pixels');
      const gamma = await read({ ...color, levels: { ...color.levels, gamma: 2 } });
      if (gamma[128 * 4] < 178 || gamma[128 * 4] > 182) throw Error('Gamma > 1 must brighten midtones');
      const lifted = identity.map(point => point.x === 128 ? { x: 128, y: 190 } : point);
      const rgb = await read({ ...color, curves: { ...color.curves, rgb: lifted } });
      if (rgb[128 * 4] !== 190 || rgb[128 * 4 + 1] !== 190) throw Error('RGB curve must remap all channels at its control points');
      const red = await read({ ...color, curves: { ...color.curves, red: lifted } });
      if (red[128 * 4] !== 190 || red[128 * 4 + 1] !== 128 || red[128 * 4 + 2] !== 128) throw Error('Individual channel curves must only change that channel');
      const output = await read({ ...color, levels: { ...color.levels, outputBlack: 20, outputWhite: 230 } });
      if (output[0] !== 20 || output[254 * 4] < 228) throw Error('Output levels must control the available tonal range');
      for (let i = 3; i < base.length; i += 4) if ([levels, gamma, rgb, red, output].some(pixels => pixels[i] !== base[i])) throw Error('Color edits must preserve every alpha value');
      for (let v = 0; v < 255; v++) if (base[v * 4] !== v) throw Error('Neutral settings must preserve opaque source colors');
      const old = await read(undefined);
      if (base.some((v, i) => v !== old[i])) throw Error('Old documents without color settings must retain the same output');
      const table = curveTable([{ x: 0, y: 0 }, { x: 40, y: 8 }, { x: 180, y: 220 }, { x: 255, y: 255 }]);
      if (table.some((v, i) => !Number.isFinite(v) || v < 0 || v > 255 || i > 0 && v < table[i - 1])) throw Error('Monotone input points must yield a bounded, monotone smooth curve');
      if (!isValidColorAdjustments(normalizeColorAdjustments()) || isValidColorAdjustments({ ...color, curves: { ...color.curves, rgb: [{ x: 0, y: 0 }, { x: 0, y: 255 }] } }) || isValidColorAdjustments({ ...color, levels: { ...color.levels, gamma: 'wrong' } })) throw Error('Invalid imported curves/levels must be rejected');
      return { passed: 10, black: levels[128], midpoint: gamma[512], rgb: rgb[512], red: Array.from(red.slice(512, 515)) };
    });
  } finally { await p.close(); }
}
