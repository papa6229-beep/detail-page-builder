import { removeBackground } from '@imgly/background-removal';
import { finishImage } from './finishImage';

let removalQueue = Promise.resolve();
let hasRun = false;
self.onmessage = (event) => {
  const message = event.data;
  if (message.kind === 'finish') {
    const start = performance.now();
    void finishImage(message.blob, message.strength, message.shadow)
      .then(blob => self.postMessage({ kind: 'finished', id: message.id, blob, ms: performance.now() - start }))
      .catch(error => self.postMessage({ kind: 'error', id: message.id, operation: 'finish', message: String(error?.message || error) }));
    return;
  }
  if (message.kind !== 'remove') return;
  removalQueue = removalQueue.then(async () => {
    const start = performance.now();
    try {
      const cold = !hasRun;
      const blob = await removeBackground(message.file, {
        device: 'cpu', model: 'isnet_fp16', rescale: true,
        output: { format: 'image/png', quality: 1 },
        progress: (key, current, total) => self.postMessage({ kind: 'progress', id: message.id, key, current, total }),
      });
      hasRun = true;
      self.postMessage({ kind: 'cutout', id: message.id, blob, ms: performance.now() - start, cold });
    } catch (error) {
      self.postMessage({ kind: 'error', id: message.id, operation: 'remove', message: String(error?.message || error) });
    }
  });
};
