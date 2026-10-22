async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
  const p = await context.newPage(); p.setDefaultTimeout(8000);
  try {
    const assert = (value, message) => { if (!value) throw new Error(message); };
    await p.goto('http://127.0.0.1:3000/');
    const home = p.getByRole('main', { name: '빌더 작업 홈', exact: true });
    await home.waitFor();
    assert(await home.getByRole('heading', { name: 'Detail Page Builder', exact: true }).count() === 1 && await home.getByText('Version 3.2.2', { exact: true }).count() === 1, 'Home must show the English application name and release version');
    assert(await home.locator('.builder-home-art').count() === 0 && !(await home.textContent()).includes('상품의 매력을'), 'Home illustration and previous marketing headline must be removed');
    await p.getByRole('button', { name: '작업 시작하기', exact: true }).click();
    const name = p.getByPlaceholder('예: 바나나 오나홀', { exact: true });
    const status = p.getByRole('status', { name: '자동 저장 상태', exact: true });
    await name.fill('루미너스 · 데일리 케어');
    await status.filter({ hasText: '저장됨' }).waitFor();
    await p.getByRole('button', { name: '작업 홈', exact: true }).click(); await home.waitFor();
    await home.getByRole('button').filter({ hasText: '루미너스 · 데일리 케어' }).waitFor();
    assert(await home.getByRole('button', { name: '편집 이어하기', exact: true }).isEnabled(), 'The home must offer the last saved document');
    await home.getByRole('button', { name: '새 상품 작업', exact: true }).click();
    await name.waitFor(); assert(await name.inputValue() === '', 'Home new-product action must open a separate blank document');
    await name.fill('듀오 케어 · 기프트 세트'); await status.filter({ hasText: '저장됨' }).waitFor();
    await p.getByRole('button', { name: '작업 홈', exact: true }).click(); await home.waitFor();
    await p.waitForFunction(() => document.querySelectorAll('.builder-home-project').length === 2);
    await p.screenshot({ path: 'C:/Users/BNN/Documents/ChatGPT/detail_builder/builder-home-desktop.png', fullPage: true });
    await p.setViewportSize({ width: 390, height: 844 });
    assert(await home.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Home must fit a narrow screen without horizontal overflow');
    await p.screenshot({ path: 'C:/Users/BNN/Documents/ChatGPT/detail_builder/builder-home-mobile.png', fullPage: true });
    await p.setViewportSize({ width: 1440, height: 1050 });
    await home.getByRole('button').filter({ hasText: '루미너스 · 데일리 케어' }).click();
    await name.waitFor(); assert(await name.inputValue() === '루미너스 · 데일리 케어', 'Recent work must reopen the selected product');
    await p.reload(); await status.filter({ hasText: '저장됨' }).waitFor();
    assert(await name.inputValue() === '루미너스 · 데일리 케어', 'Reload during editing must stay in the editor with the same project');
    await p.getByRole('button', { name: '불러오기', exact: true }).click();
    const library = p.getByRole('dialog', { name: '작업 보관함', exact: true });
    await p.waitForFunction(() => document.querySelectorAll('dialog[open] [data-project-row]').length === 2);
    await p.screenshot({ path: 'C:/Users/BNN/Documents/ChatGPT/detail_builder/builder-project-library.png' });
    assert(await library.locator('[data-project-row]').count() === 2, 'Library must contain both independent projects');
    return { passed: 8, screenshots: 3 };
  } finally { await context.close(); }
}
