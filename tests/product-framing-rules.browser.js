async (page) => {
  await page.goto('http://127.0.0.1:3000/');
  return await page.evaluate(async () => {
    const { analyseProductFraming, framingLayout, clearChangedProductFraming } = await import('/productFraming.ts');
    const { writeImageSlot } = await import('/imageProcessing.ts');
    const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const c = document.createElement('canvas'); c.width = 800; c.height = 600;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(450, 300, 200, 100);
    const image = c.toDataURL(), frame = await analyseProductFraming(image);
    assert(frame.bounds.left === 450 && frame.bounds.top === 300 && frame.bounds.width === 200 && frame.bounds.height === 100, 'Bounds must use alpha rather than color, including white products');
    const main = framingLayout(frame, 720, 360, 'main');
    assert(Math.abs(main.productWidth / main.productHeight - 2) < .001 && main.productWidth > 500, 'Fit must maintain aspect ratio and use actual foreground bounds');
    for (const [width, height] of [[202, 202], [400, 400], [500, 500], [274, 411]]) {
      const p = framingLayout({ ...frame, zoom: 100, offsetX: 1000, offsetY: -1000 }, width, height, 'thumbnail');
      assert(p.productX >= 0 && p.productY >= 0 && p.productX + p.productWidth <= width && p.productY + p.productHeight <= height - width / 500 * 128, 'Extreme movement and resize must keep product inside the photo area and above branding');
    }
    const base = { ...INITIAL_PRODUCT_DATA, mainImage: image, productFraming: { main: frame, thumbnail: frame } };
    const replaced = clearChangedProductFraming(base, { ...base, mainImage: 'new-image' });
    assert(!replaced.productFraming.main && !replaced.productFraming.thumbnail, 'Main replacement must reset main and fallback-thumbnail placements');
    const independent = { ...base, thumbnailImage: 'separate-thumbnail' };
    const independentNext = clearChangedProductFraming(independent, { ...independent, mainImage: 'new-image' });
    assert(!independentNext.productFraming.main && independentNext.productFraming.thumbnail, 'A separate thumbnail placement must survive a main replacement');
    assert(!writeImageSlot(base, 'mainImage', 'processed-image').productFraming.main, 'Applying image processing must invalidate the old framing');
    x.clearRect(0, 0, c.width, c.height);
    let empty = false; try { await analyseProductFraming(c.toDataURL()); } catch { empty = true; }
    assert(empty, 'A fully transparent image must not generate invalid placement');
    const source = await createImageBitmap(await (await fetch(image)).blob());
    assert(source.width === 800 && source.height === 600, 'Analysis must keep the original image unchanged'); source.close();
    return { passed: 8 };
  });
}
