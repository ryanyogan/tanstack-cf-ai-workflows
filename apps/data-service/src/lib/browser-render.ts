import puppeteer from '@cloudflare/puppeteer';

export async function collectDestinationInformation(env: Env, destinationUrl: string) {
	const browser = await puppeteer.launch(env.VIRTUAL_BROWSER);
	const page = await browser.newPage();

	try {
		const response = await page.goto(destinationUrl, {
			waitUntil: 'networkidle0',
			timeout: 30000
		});

		await page.waitForNetworkIdle();

		const bodyText = (await page.$eval('body', (el) => el.innerText)) as string;
		const html = await page.content();
		const status = response ? response.status() : 0;

		const screenshot = await page.screenshot({ encoding: 'base64' });
		const screenshotDataUrl = `data:image/png;base64,${screenshot}`;

		return {
			bodyText,
			html,
			status,
			screenshotDataUrl,
		};
	} finally {
		// Properly cleanup page and browser to avoid websocket errors
		try {
			await page.close();
		} catch (e) {
			// Ignore page close errors
			console.warn('Error closing page:', e);
		}

		try {
			await browser.close();
		} catch (e) {
			// Ignore browser close errors
			console.warn('Error closing browser:', e);
		}
	}
}
