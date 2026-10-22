async (page) => {
  const probe = await page.context().newPage();
  try {
    await probe.goto('http://127.0.0.1:3001/image-lab.html');
    return await probe.evaluate(async () => {
      const { finishImage } = await import('/lab/finishImage.ts');
      const { DEFAULT_SHADOW } = await import('/lab/shadow.ts');
      const canvas = new OffscreenCanvas(640, 320), ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(120,110,120,.35)';
      ctx.beginPath(); ctx.ellipse(240, 205, 170, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#905949';
      ctx.beginPath(); ctx.ellipse(475, 165, 40, 85, -.3, 0, Math.PI * 2); ctx.fill();
      const source = ctx.getImageData(0, 0, 640, 320).data;
      const input = await canvas.convertToBlob();
      const output = await finishImage(input, 0, DEFAULT_SHADOW);
      const image = await createImageBitmap(output);
      ctx.clearRect(0, 0, 640, 320); ctx.drawImage(image, 0, 0); image.close();
      const pixels = ctx.getImageData(0, 0, 640, 320).data;
      let bodyPeak = 0, changedOpaquePixels = 0;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 640; x++) {
        const i = (y * 640 + x) * 4;
        if (source[i + 3] === 255 && [0, 1, 2, 3].some(c => source[i + c] !== pixels[i + c])) changedOpaquePixels++;
        if (x >= 100 && x < 385 && y >= 246 && y < 275 && source[i + 3] === 0) bodyPeak = Math.max(bodyPeak, pixels[i + 3]);
      }
      if (bodyPeak < 10) throw new Error(`Translucent body must cast a visible shadow too; peak ${bodyPeak}/255`);
      if (changedOpaquePixels) throw new Error('The shadow must not change opaque product pixels');
      const moduleSource = await (await fetch('/lab/main.tsx')).text();
      const version = moduleSource.match(/react-dom_client\.js\?v=([^\"]+)/)[1];
      const ReactModule = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
      const React = ReactModule.default ?? ReactModule;
      const ClientModule = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
      const { createRoot } = ClientModule.default ?? ClientModule;
      const { ShadowPreview } = await import('/lab/ShadowPreview.tsx');
      const target = document.createElement('div'); target.style.cssText = 'width:640px;height:320px';
      document.body.replaceChildren(target);
      const root = createRoot(target);
      const consistency = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Live shadow export timed out')), 10000);
        root.render(React.createElement(ShadowPreview, {
          blob: input, settings: DEFAULT_SHADOW, actualSize: true, onChange: () => {},
          onError: message => { clearTimeout(timeout); reject(new Error(message)); },
          onExport: async blob => {
            try {
              const bitmap = await createImageBitmap(blob);
              ctx.clearRect(0, 0, 640, 320); ctx.drawImage(bitmap, 0, 0); bitmap.close();
              const exported = ctx.getImageData(0, 0, 640, 320).data;
              const live = target.querySelector('canvas').getContext('2d').getImageData(0, 0, 640, 320).data;
              let exportDiff = 0, previewDiff = 0, alphaDiff = 0;
              for (let i = 0; i < pixels.length; i++) {
                previewDiff = Math.max(previewDiff, Math.abs(exported[i] - live[i]));
                if (i % 4 === 3) { alphaDiff = Math.max(alphaDiff, Math.abs(pixels[i] - exported[i])); continue; }
                const a = i - i % 4 + 3;
                // Compare visible color: tiny-alpha PNG RGB round trips can differ without a visible difference.
                const first = 255 + (pixels[i] - 255) * pixels[a] / 255;
                const second = 255 + (exported[i] - 255) * exported[a] / 255;
                exportDiff = Math.max(exportDiff, Math.abs(first - second));
              }
              clearTimeout(timeout); resolve({ exportDiff, previewDiff, alphaDiff });
            } catch (error) { clearTimeout(timeout); reject(error); }
          },
        }));
      });
      root.unmount();
      // Worker readback uses a CPU canvas; Chromium's GPU blur can vary by a few alpha levels.
      // The actual live preview and its downloaded PNG must still match exactly (within PNG rounding).
      if (consistency.exportDiff > 8 || consistency.previewDiff > 2 || consistency.alphaDiff > 8) throw new Error(`Live and saved shadows must match: ${JSON.stringify(consistency)}`);
      return { passed: 3, bodyPeak, changedOpaquePixels, ...consistency };
    });
  } finally { await probe.close(); }
}
