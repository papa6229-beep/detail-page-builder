async (page) => {
  page.setDefaultTimeout(8000);
  await page.goto('http://127.0.0.1:3000/');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  assert(await page.getByRole('button', { name: '전체 텍스트 오타 검수', exact: true }).count() === 1, 'Toolbar needs selective text review');
  assert(await page.locator('a[href*="adobe.com"]').count() === 0, 'Adobe links must be removed');
  const name = page.getByPlaceholder('예: 바나나 오나홀', { exact: true });
  await name.fill('테스트 오나홀 입니디');
  const brand = page.getByPlaceholder('예: BANANA MALL', { exact: true });
  await brand.fill('바나나 입니디');
  let calls = 0, body;
  await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
    calls++; body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestions: [
      { field: 'productNameKr', before: '입니디', after: '입니다', occurrence: 0, reason: '어미 오타' },
      { field: 'brandName', before: '입니디', after: '입니다', occurrence: 0, reason: '어미 오타' },
    ] }) } }] }) });
  });
  await page.getByRole('button', { name: '전체 텍스트 오타 검수', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '전체 텍스트 오타 검수', exact: true });
  await dialog.getByRole('button', { name: '검수 시작', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert(calls === 0, 'Missing connection key must not send a request');
  await dialog.getByLabel('OpenRouter 연결 키').fill('test-key-not-a-real-secret');
  await dialog.getByRole('button', { name: '검수 시작', exact: true }).click();
  await dialog.getByText('어미 오타', { exact: true }).first().waitFor();
  assert(await name.inputValue() === '테스트 오나홀 입니디' && await brand.inputValue() === '바나나 입니디', 'Reviewing must not edit any text automatically');
  const checks = dialog.getByRole('checkbox');
  assert(await checks.count() === 2 && !(await checks.nth(0).isChecked()) && !(await checks.nth(1).isChecked()), 'Every candidate must start unchecked');
  await checks.nth(0).check();
  await dialog.getByRole('button', { name: '선택한 수정 적용', exact: true }).click();
  assert(await name.inputValue() === '테스트 오나홀 입니다' && await brand.inputValue() === '바나나 입니디', 'Only explicitly selected candidates may change');
  assert(calls === 1 && body.model === 'google/gemini-2.5-flash-lite' && !JSON.stringify(body).includes('mainImage'), 'Review must send only text and must not auto-retry');
  await dialog.waitFor({ state: 'detached' });
  await page.unroute('https://openrouter.ai/api/v1/chat/completions');
  await page.route('https://openrouter.ai/api/v1/chat/completions', route => route.fulfill({ status: 429, contentType: 'application/json', body: '{}' }));
  await page.getByRole('button', { name: '전체 텍스트 오타 검수', exact: true }).click();
  await dialog.getByRole('button', { name: '검수 시작', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert(await brand.inputValue() === '바나나 입니디', 'API failure must preserve the document');
  await dialog.getByRole('button', { name: '검수 닫기', exact: true }).click();
  await page.unroute('https://openrouter.ai/api/v1/chat/completions');
  await page.route('https://openrouter.ai/api/v1/chat/completions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"suggestions":[]}' } }] }) }));
  await page.getByRole('button', { name: '전체 텍스트 오타 검수', exact: true }).click();
  await dialog.getByRole('button', { name: '검수 시작', exact: true }).click();
  await dialog.getByText('수정 후보가 없습니다.', { exact: false }).waitFor();
  assert(await dialog.getByRole('button', { name: '선택한 수정 적용', exact: true }).isDisabled(), 'Empty review must leave apply disabled');
  await page.unroute('https://openrouter.ai/api/v1/chat/completions');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('https://openrouter.ai/api/v1/chat/completions', async route => { await gate; try { await route.fulfill({ status: 200, body: '{}' }); } catch {} });
  const request = page.waitForRequest('https://openrouter.ai/api/v1/chat/completions');
  await dialog.getByRole('button', { name: '검수 시작', exact: true }).click(); await request;
  await dialog.getByRole('button', { name: '검수 중단', exact: true }).click(); release();
  assert(await dialog.getByRole('button', { name: '검수 시작', exact: true }).isEnabled() && await name.inputValue() === '테스트 오나홀 입니다', 'Cancel must stop the request without altering text or blocking another review');
  await dialog.getByRole('button', { name: '검수 닫기', exact: true }).click();
  await page.unroute('https://openrouter.ai/api/v1/chat/completions');
  return { passed: 10, mockedApi: true };
}
