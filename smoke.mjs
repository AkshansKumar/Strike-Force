import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const root = path.resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(p)) p = path.join(root, 'index.html');
  res.setHeader('content-type', mime[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(4173, r));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: '/tmp/shot-menu.png' });

// click DEPLOY
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('DEPLOY'));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 2500));
// simulate some movement & firing
await page.keyboard.down('KeyW');
await page.evaluate(() => { window.dispatchEvent(new MouseEvent('mousedown', { button: 0 })); });
await new Promise((r) => setTimeout(r, 2500));
await page.keyboard.up('KeyW');
await page.evaluate(() => { window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/shot-game.png' });

// mobile emulation pass
const page2 = await browser.newPage();
await page2.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
page2.on('console', (m) => { if (m.type() === 'error') errors.push('MOBILE: '+m.text()); });
page2.on('pageerror', (e) => errors.push('MOBILE PAGEERROR: ' + e.message));
await page2.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
await page2.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('DEPLOY')); b?.click(); });
await new Promise((r) => setTimeout(r, 4000));
await page2.screenshot({ path: '/tmp/shot-mobile.png' });
await page2.close();

console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
server.close();
process.exit(0);
