async (page) => {
  await page.goto('http://127.0.0.1:3000/');
  return await page.evaluate(async () => {
    const { normalizeImageTransform, clearChangedPreviewTransforms } = await import('/previewImageTransforms.ts');
    const { clearChangedImageEdits, writeImageSlot } = await import('/imageProcessing.ts');
    const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    assert(JSON.stringify(normalizeImageTransform()) === '{"x":0,"y":0,"scale":1,"angle":0}', 'Older saves must use identity transforms');
    const extreme = normalizeImageTransform({ x: 1e9, y: -1e9, scale: -5, angle: 390 });
    assert(extreme.x === 300 && extreme.y === -300 && extreme.scale === .15 && extreme.angle === 30, 'Transforms must remain finite and angles wrap');
    const t = { x: 4, y: 5, scale: .8, angle: 12 };
    const base = { ...INITIAL_PRODUCT_DATA, mainImage: 'main', packageImage: 'package', watermarkImage: 'logo', options: [{ id: 'stable', name: 'A', image: 'option', x: 0, y: 0, width: 200, height: 300 }], previewImageTransforms: { mainImage: t, thumbnailImage: t, thumbnailPackage: t, 'option:stable': t, 'watermark:mainImage': t } };
    const main = clearChangedImageEdits(base, { ...base, mainImage: 'new-main' });
    assert(!main.previewImageTransforms.mainImage && !main.previewImageTransforms.thumbnailImage && main.previewImageTransforms.thumbnailPackage, 'New main photo must reset only main and its fallback thumbnail');
    const option = writeImageSlot(base, 'option:stable', 'new-option');
    assert(!option.previewImageTransforms['option:stable'] && option.previewImageTransforms.mainImage, 'Image processing must clear only the edited option transform');
    const watermark = clearChangedPreviewTransforms(base, { ...base, watermarkImage: 'new-logo' });
    assert(!watermark.previewImageTransforms['watermark:mainImage'] && watermark.previewImageTransforms.mainImage, 'New logo must invalidate watermark transformations only');
    const separate = { ...base, thumbnailImage: 'own-photo' };
    assert(clearChangedPreviewTransforms(separate, { ...separate, mainImage: 'new' }).previewImageTransforms.thumbnailImage, 'Separate thumbnail must remain independent');
    return { passed: 6 };
  });
}
