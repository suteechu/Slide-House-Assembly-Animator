const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const child_process = require('child_process');

// Test 1: Check dist/index.html and GitHub Pages root index.html both exist and use relative paths
console.log('Checking Ver4 standalone dist and static root build output...');
assert(fs.existsSync(path.join(__dirname, 'dist', 'index.html')), 'dist/index.html missing');
assert(fs.existsSync(path.join(__dirname, 'index.html')), 'root index.html missing');
const indexHtml = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
const rootHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(!indexHtml.includes('iframe'), 'dist/index.html should not contain iframe tag');
assert(!rootHtml.includes('src.jsx'), 'root index.html must use compiled JS bundle (not raw src.jsx) for GitHub Pages');
assert(rootHtml.includes('./presentation_data.js'), 'root index.html must use relative ./ paths');
assert(/\.\/dist\/assets\/(?:index|studio)-/.test(rootHtml), 'root index.html must reference built ./dist/assets/ bundle');
console.log('PASS: dist/index.html and static GitHub Pages root index.html verified');

// Test 2: Start V4 server on an isolated test port and verify HTTP routing
console.log('Testing standalone V4 server.cjs endpoints...');
const testPort = 18787;
const serverProcess = child_process.fork(path.join(__dirname, 'server.cjs'), [], {
  env: { ...process.env, PORT: String(testPort) },
  silent: true
});

serverProcess.stderr.on('data', d => {
  console.error('server err:', d.toString());
});

function fetchUrl(pathname) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${testPort}${pathname}`, res => {
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(data)
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  await new Promise(r => setTimeout(r, 700));

  try {
    // 2.1: Root endpoint
    const resRoot = await fetchUrl('/');
    assert.strictEqual(resRoot.statusCode, 200, 'GET / must return 200');
    assert(resRoot.body.toString('utf8').includes('Ver4 · Auto BOM Studio'), 'Root must be Ver4 HTML');
    console.log('PASS: GET / returned 200 with Ver4 HTML');

    // 2.2: GitHub Pages static root HTML & relative dist bundle route
    const resStaticIndex = await fetchUrl('/index.html');
    assert.strictEqual(resStaticIndex.statusCode, 200, 'GET /index.html must return 200');
    const matchRootJs = rootHtml.match(/src="\.\/(dist\/assets\/(?:index|studio)-[^"]+\.js)"/);
    assert(matchRootJs, 'Could not find compiled ./dist/assets/ JS bundle in root index.html');
    const resRootBundle = await fetchUrl('/' + matchRootJs[1]);
    assert.strictEqual(resRootBundle.statusCode, 200, `GET /${matchRootJs[1]} must return 200`);
    const rootBundleText = resRootBundle.body.toString('utf8');
    assert(!rootBundleText.includes('"/assets/'), 'Bundled image refs must not use leading /assets/');
    console.log(`PASS: GitHub Pages /index.html -> ./${matchRootJs[1]} verified (no leading / paths)`);

    // 2.3: Presentation engine scripts
    const resScript = await fetchUrl('/presentation_app.js');
    assert.strictEqual(resScript.statusCode, 200, 'GET /presentation_app.js must return 200');
    assert(resScript.body.toString('utf8').includes('PresentationApp'), 'Engine script must contain PresentationApp');
    console.log('PASS: GET /presentation_app.js returned 200');

    const resV3Script = await fetchUrl('/presentation_v3.js');
    assert.strictEqual(resV3Script.statusCode, 200, 'GET /presentation_v3.js must return 200');
    assert(resV3Script.body.toString('utf8').includes('drawSlide13ResultsScene'), 'Must contain drawSlide13ResultsScene');
    console.log('PASS: GET /presentation_v3.js returned 200');

    // 2.4: Assets, Interior icons, and Pictures
    const resImg = await fetchUrl('/assets/ver3/slide_01_full.png');
    assert.strictEqual(resImg.statusCode, 200, 'GET /assets/ver3/slide_01_full.png must return 200');
    assert.strictEqual(resImg.headers['content-type'], 'image/png', 'Must have image/png content type');
    console.log('PASS: GET /assets/ver3/slide_01_full.png returned 200');

    const resIcon = await fetchUrl('/ICON/Interior/CODE.png');
    assert.strictEqual(resIcon.statusCode, 200, 'GET /ICON/Interior/CODE.png must return 200');
    console.log('PASS: GET /ICON/Interior/CODE.png returned 200');

    const resPic = await fetchUrl('/Pictures/automation_summary_deliverables.jpg');
    assert.strictEqual(resPic.statusCode, 200, 'GET /Pictures/automation_summary_deliverables.jpg must return 200');
    console.log('PASS: GET /Pictures/automation_summary_deliverables.jpg returned 200');

    // 2.5: Confirm legacy Ver3 routes are NOT present in V4-only build
    const resLegacy = await fetchUrl('/legacy/ver3.html');
    assert.strictEqual(resLegacy.statusCode, 404, 'GET /legacy/ver3.html must return 404 in V4-only build');
    console.log('PASS: Legacy Ver3 routes cleanly removed (404)');

    // 2.6: Vite JS bundle from dist/assets/
    const matchJs = indexHtml.match(/src="\.\/(assets\/(?:index|studio)-[^"]+\.js)"/);
    assert(matchJs, 'Could not find relative ./assets/ Vite JS bundle in dist/index.html');
    const resBundle = await fetchUrl('/' + matchJs[1]);
    assert.strictEqual(resBundle.statusCode, 200, `GET /${matchJs[1]} must return 200`);
    const bundleText = resBundle.body.toString('utf8');
    assert(bundleText.includes('stageCanvas'), 'Vite bundle must contain stageCanvas ref');
    assert(!bundleText.includes('/legacy/ver3.html'), 'Vite bundle must not link to /legacy/ver3.html');
    console.log(`PASS: GET /${matchJs[1]} returned 200 (V4-only bundle verified)`);

    console.log('\nALL VER4 STANDALONE & GITHUB PAGES TESTS PASSED SUCCESSFULLY!');
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  serverProcess.kill('SIGKILL');
  process.exit(1);
});
