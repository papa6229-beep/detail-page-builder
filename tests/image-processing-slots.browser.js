async (page) => {
  return await page.evaluate(async () => {
    const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
    const { getImageSlots, writeImageSlot, clearChangedImageEdits } = await import('/imageProcessing.ts');
    const { DEFAULT_SHADOW } = await import('/lab/shadow.ts');
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const png = 'data:image/png;base64,fixture', gif = 'data:image/gif;base64,fixture';
    const base = { ...INITIAL_PRODUCT_DATA, mainImage: png, packageImage: png, isPackageImageEnabled: false, videoInsertImage: gif, watermarkImage: png, featureImage: '__ENABLED__', thumbnailImage: png, options: [{ id: 'stable-id', name: 'A', image: png, x: 10, y: 20, width: 80, height: 90 }, { id: 'gif-option', name: 'B', image: gif, x: 0, y: 0, width: 80, height: 90 }] };
    assert(getImageSlots(base).map(slot => slot.key).join(',') === 'mainImage,option:stable-id,thumbnailImage', 'Queue must skip placeholders, disabled package, GIF and watermark logo');
    const mainEdit = { original: png, tone: 45, shadow: { ...DEFAULT_SHADOW } };
    const main = writeImageSlot(base, 'mainImage', 'main-result', mainEdit);
    const option = writeImageSlot(main, 'option:stable-id', 'option-result', mainEdit);
    assert(option.options[0].image === 'option-result' && option.options[0].x === 10 && option.options[1].image === gif && option.mainImage === 'main-result', 'Option edits must preserve IDs, positions and other image slots');
    const replaced = clearChangedImageEdits(option, { ...option, options: option.options.map(item => item.id === 'stable-id' ? { ...item, image: 'new-upload' } : item) });
    assert(!replaced.imageEdits['option:stable-id'] && replaced.imageEdits.mainImage.original === png, 'Replacing one option must invalidate only its own edit history');
    const restored = writeImageSlot(option, 'mainImage', png);
    assert(restored.mainImage === png && !restored.imageEdits.mainImage && restored.imageEdits['option:stable-id'], 'Restore must remove only the restored image adjustment');
    return { passed: 4 };
  });
}
