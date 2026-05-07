async (page) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.route('**/api/llm/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          role: 'assistant',
          content: `方差公式可以写成：

$$s^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2$$

标准化时常见：$z=\\frac{x-\\mu}{\\sqrt{\\sigma^2}}$。`,
        },
        provider: 'mock',
        model: 'math-render-check',
        prompt_profile: 'three_stage',
        learning_phase: 'understanding',
        conversation_id: 9001,
        exchange_count: 1,
      }),
    });
  });

  await page.goto('http://localhost:4173/#tutor');
  await page.waitForLoadState('networkidle');
  await page.locator('textarea').fill('请解释方差和标准化公式');
  await page.getByRole('button', { name: '发送' }).click();
  await page.waitForSelector('.katex');

  const result = await page.evaluate(() => ({
    katexCount: document.querySelectorAll('.katex').length,
    displayCount: document.querySelectorAll('.katex-display').length,
    hasFraction: Boolean(document.querySelector('.mfrac')),
    hasRoot: Boolean(document.querySelector('.sqrt')),
    bodyText: document.body.innerText,
  }));

  if (result.katexCount < 2) throw new Error(`Expected at least 2 KaTeX nodes, got ${result.katexCount}`);
  if (result.displayCount < 1) throw new Error('Expected a block KaTeX display formula');
  if (!result.hasFraction) throw new Error('Expected rendered fraction DOM');
  if (!result.hasRoot) throw new Error('Expected rendered square-root DOM');
  if (consoleErrors.length > 0) throw new Error(`Console errors: ${consoleErrors.join('\\n')}`);

  console.log(JSON.stringify(result));
}
