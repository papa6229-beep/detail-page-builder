async (page) => {
  await page.goto('http://127.0.0.1:3001/image-lab.html');
  const title = await page.getByRole('heading', { name: '상품사진 테스트', exact: true }).count();
  if (title !== 1) throw new Error('FAIL: independent image upload and comparison test page is missing');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fixture.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64'),
  });
  await page.locator('img[alt="원본"]').waitFor();
  if (!(await page.getByRole('button', { name: '테스트 실행', exact: true }).isEnabled())) throw new Error('Uploaded image must enable processing');
  return { upload: 'passed' };
}
