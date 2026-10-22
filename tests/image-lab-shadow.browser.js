async (page) => {
  const probe = await page.context().newPage();
  try {
    await probe.goto('http://127.0.0.1:3001/image-lab.html');
    return await probe.evaluate(async () => {
      const { finishImage } = await import('/lab/finishImage.ts');
      const { drawShadow, createShadowMask, normalizeShadow } = await import('/lab/shadow.ts');
      const assert = (condition, message) => { if (!condition) throw new Error(message); };
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 320;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#905949';
      ctx.beginPath(); ctx.roundRect(90, 165, 380, 65, 25); ctx.fill();
      ctx.beginPath(); ctx.ellipse(470, 160, 42, 70, -.3, 0, Math.PI * 2); ctx.fill();
      const source = ctx.getImageData(0, 0, 640, 320).data;
      const input = await new Promise(resolve => canvas.toBlob(resolve));
      const defaults = { enabled: true, opacity: 45, offsetX: 0, offsetY: 0, blur: 6, width: 100, depth: 100 };
      const read = async (options) => {
        const blob = await finishImage(input, 0, options);
        const bitmap = await createImageBitmap(blob);
        assert(bitmap.width === 640 && bitmap.height === 320, 'Shadow must preserve original canvas dimensions');
        ctx.clearRect(0, 0, 640, 320); ctx.drawImage(bitmap, 0, 0); bitmap.close();
        const pixels = ctx.getImageData(0, 0, 640, 320).data;
        let peak = 0, mass = 0, xMass = 0, yMass = 0, foregroundChanges = 0;
        for (let y = 0; y < 320; y++) for (let x = 0; x < 640; x++) {
          const i = (y * 640 + x) * 4;
          if (source[i + 3] === 255 && [0, 1, 2, 3].some(c => source[i + c] !== pixels[i + c])) foregroundChanges++;
          if (source[i + 3] !== 0) continue;
          const a = pixels[i + 3]; peak = Math.max(peak, a); mass += a; xMass += x * a; yMass += y * a;
        }
        return { peak, mass, x: xMass / mass, y: yMass / mass, foregroundChanges };
      };
      const normal = await read(defaults);
      assert(normalizeShadow(defaults).angle === 0 && normalizeShadow({ ...defaults, angle: 390 }).angle === 30, 'Old settings must default to zero rotation, and angles must wrap');
      assert(normal.peak >= 25, `Default shadow must remain visible on a horizontal product: peak ${normal.peak}/255`);
      assert(normal.foregroundChanges === 0, 'Shadow must not recolor opaque product pixels');
      const rotated = await read({ ...defaults, angle: 30 });
      assert(rotated.foregroundChanges === 0 && Math.abs(rotated.mass - normal.mass) > 1000, 'Rotation must change the shadow without recoloring the product');
      const off = await read({ ...defaults, enabled: false });
      const zero = await read({ ...defaults, opacity: 0 });
      assert(off.mass === 0 && zero.mass === 0, 'Disabled and zero-opacity shadows must produce no shadow');
      const strong = await read({ ...defaults, opacity: 80 });
      assert(strong.mass > normal.mass * 1.4, 'Opacity must visibly strengthen the shadow');
      const moved = await read({ ...defaults, offsetX: 20, offsetY: 15 });
      assert(moved.x > normal.x + 30 && moved.y > normal.y + 6, 'Position controls must move the rendered shadow');
      const sharp = await read({ ...defaults, blur: 0 });
      const soft = await read({ ...defaults, blur: 20 });
      assert(sharp.peak > soft.peak, 'Softness must lower the peak while spreading the shadow');
      const narrow = await read({ ...defaults, width: 60 });
      const wide = await read({ ...defaults, width: 150 });
      assert(wide.mass > narrow.mass, 'Width must change the shadow footprint');
      const shallow = await read({ ...defaults, depth: 50 });
      const deep = await read({ ...defaults, depth: 180 });
      assert(deep.mass > shallow.mass, 'Depth must change the shadow footprint');
      const sourceCanvas = new OffscreenCanvas(640, 320);
      sourceCanvas.getContext('2d').fillRect(90, 100, 420, 130);
      const bounds = { left: 90, right: 509, top: 100, bottom: 229 };
      const mask = createShadowMask(sourceCanvas, bounds);
      const full = new OffscreenCanvas(640, 320);
      drawShadow(full.getContext('2d'), bounds, defaults, mask);
      const small = new OffscreenCanvas(320, 160), smallCtx = small.getContext('2d');
      smallCtx.scale(.5, .5); drawShadow(smallCtx, bounds, defaults, mask);
      const reference = new OffscreenCanvas(320, 160), refCtx = reference.getContext('2d');
      refCtx.drawImage(full, 0, 0, 320, 160);
      const a = smallCtx.getImageData(0, 0, 320, 160).data, b = refCtx.getImageData(0, 0, 320, 160).data;
      let scaledAlphaDiff = 0;
      for (let i = 3; i < a.length; i += 4) scaledAlphaDiff = Math.max(scaledAlphaDiff, Math.abs(a[i] - b[i]));
      assert(scaledAlphaDiff <= 8, `Scaled live preview must preserve exported shadow softness: alpha difference ${scaledAlphaDiff}`);
      return { passed: 11, normal, strong, moved, sharp, soft, scaledAlphaDiff };
    });
  } finally { await probe.close(); }
}
