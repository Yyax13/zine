import path from 'path';
import puppeteer from 'puppeteer';
import { __dirname } from '../server.js';

async function generateOgDataUrl(title, description = '') {
    const fontWoff2 = path.join(__dirname, 'public', 'css', 'fonts', 'gohu.woff2');
    const fontWoff  = path.join(__dirname, 'public', 'css', 'fonts', 'gohu.woff');

    const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @font-face {
            font-family: 'gohu';
            src: url('${fontWoff2}') format('woff2'),
                 url('${fontWoff}') format('woff');
          }

          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            width: 1200px; height: 630px;
            background: #000;
            font-family: 'gohu', monospace;
            color: #fff;
            overflow: hidden;
            position: relative;
          }

          /* scanlines overlay */
          body::after {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0, 0, 0, 0.18) 3px,
              rgba(0, 0, 0, 0.18) 4px
            );
            pointer-events: none;
            z-index: 100;
          }

          /* subtle red glow in center */
          .bg-glow {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 700px; height: 400px;
            background: radial-gradient(ellipse at center, rgba(167,0,0,0.12) 0%, transparent 70%);
            pointer-events: none;
          }

          /* corner brackets */
          .corner {
            position: absolute;
            width: 48px; height: 48px;
          }
          .corner-tl { top: 28px; left: 28px; border-top: 2px solid #a70000; border-left: 2px solid #a70000; }
          .corner-tr { top: 28px; right: 28px; border-top: 2px solid #a70000; border-right: 2px solid #a70000; }
          .corner-bl { bottom: 68px; left: 28px; border-bottom: 2px solid #a70000; border-left: 2px solid #a70000; }
          .corner-br { bottom: 68px; right: 28px; border-bottom: 2px solid #a70000; border-right: 2px solid #a70000; }

          /* top-right brand */
          .brand {
            position: absolute;
            top: 38px; right: 52px;
            font-size: 16px;
            color: #a70000;
            text-shadow: 0 0 10px rgba(167,0,0,0.8);
            letter-spacing: 3px;
          }

          /* main content area */
          .content {
            position: absolute;
            left: 72px; right: 72px;
            top: 50%;
            transform: translateY(-50%);
          }

          .prompt {
            font-size: 20px;
            color: #a70000;
            text-shadow: 0 0 8px rgba(167,0,0,0.6);
            margin-bottom: 18px;
            letter-spacing: 1px;
          }

          h1 {
            font-size: 56px;
            color: #fff;
            line-height: 1.15;
            margin-bottom: 26px;
            /* subtle chromatic aberration */
            text-shadow: -2px 0 rgba(167,0,0,0.5), 2px 0 rgba(100,0,0,0.3);
            word-break: break-word;
            max-height: 200px;
            overflow: hidden;
          }

          .description {
            font-size: 24px;
            color: #888;
            line-height: 1.5;
            border-left: 3px solid #a70000;
            padding-left: 18px;
            max-height: 80px;
            overflow: hidden;
          }

          /* bottom bar */
          .bottom-bar {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 48px;
            background: #a70000;
            display: flex;
            align-items: center;
            padding: 0 44px;
            justify-content: space-between;
          }

          .bottom-bar .site {
            font-size: 19px;
            color: #000;
            letter-spacing: 4px;
          }

          .bottom-bar .tagline {
            font-size: 15px;
            color: rgba(0,0,0,0.65);
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="bg-glow"></div>
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>
        <div class="brand">pwn@buff3r</div>

        <div class="content">
          <div class="prompt">$ cat article.md</div>
          <h1>${title}</h1>
          ${description ? `<div class="description">${description}</div>` : ''}
        </div>

        <div class="bottom-bar">
          <span class="site">howosec.com</span>
          <span class="tagline">// security research</span>
        </div>
      </body>
    </html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();

    return `data:image/png;base64,${buffer.toString('base64')}`;
}

export { generateOgDataUrl }