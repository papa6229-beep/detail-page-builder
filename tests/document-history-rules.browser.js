async (page) => {
  const p = await page.context().newPage();
  try {
    await p.goto('http://127.0.0.1:3000/');
    return await p.evaluate(async () => {
      const { BuilderDocumentStore } = await import('/documentStore.ts');
      const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
      const assert = (value, message) => { if (!value) throw new Error(message); };
      const store = new BuilderDocumentStore(structuredClone(INITIAL_PRODUCT_DATA));
      const transform = x => store.edit(data => ({ ...data, previewImageTransforms: { mainImage: { x, y: 0, scale: 1, angle: x } } }));
      store.beginImageEdit(); for (let x = 1; x <= 12; x++) transform(x); store.endImageEdit();
      store.setData(data => ({ ...data, brandName: '문구 보존' })); store.undo();
      assert(!store.getSnapshot().canUndo && !store.getSnapshot().data.previewImageTransforms.mainImage && store.getSnapshot().data.brandName === '문구 보존', 'One gesture is one image-only undo');
      store.redo(); assert(store.getSnapshot().data.previewImageTransforms.mainImage.x === 12, 'Redo restores the complete gesture');
      store.undo(); transform(7); assert(!store.getSnapshot().canRedo, 'New image edits must discard the redo branch');
      store.edit(data => ({ ...data, previewImageTransforms: {} })); store.undo(); assert(store.getSnapshot().data.previewImageTransforms.mainImage.x === 7, 'Reset is undoable');
      store.edit(data => ({ ...data, productFraming: { main: { imageWidth: 10, imageHeight: 10, bounds: { left: 0, top: 0, width: 10, height: 10 }, ratio: .7, zoom: 1, offsetX: 0, offsetY: 0 } } }));
      store.undo(); assert(!store.getSnapshot().data.productFraming.main, 'Product fitting is undoable');
      store.setData(data => ({ ...data, mainImage: 'new source' })); assert(!store.getSnapshot().canUndo && !store.getSnapshot().canRedo, 'Source replacement clears incompatible history');
      for (let i = 0; i < 60; i++) transform(i);
      let count = 0; while (store.getSnapshot().canUndo) { store.undo(); count++; }
      assert(count === 50, 'History must be bounded to 50 image edits');
      store.replaceProject({ id: 'B', name: 'B', customName: '', imageCount: 0, createdAt: 1, updatedAt: 1 }, structuredClone(INITIAL_PRODUCT_DATA));
      assert(!store.getSnapshot().canUndo && !store.getSnapshot().canRedo && store.getSnapshot().data.brandName === '', 'Projects must have independent history');
      return { passed: 8 };
    });
  } finally { await p.close(); }
}
