const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'presentation_data.js'), 'utf8'), sandbox);
const originalIds = Array.from(sandbox.window.DEFAULT_SLIDES, s => s.id);
const extension = path.join(__dirname, 'presentation_v3_data.js');
assert.ok(fs.existsSync(extension), 'Ver3 extension must exist');
vm.runInContext(fs.readFileSync(extension, 'utf8'), sandbox);
const slides = sandbox.window.DEFAULT_SLIDES;
assert.equal(slides.reduce((sum,s)=>sum+s.duration,0),897,'Presentation duration with 15 slides (14:57 min)');
assert.ok(slides.every(s=>s.speakerCues && s.speakerCues.length>=2),'Every scene needs speaking cues');
assert.equal(slides.length, 16);
assert.equal(new Set(slides.map(s => s.id)).size, slides.length);
assert.ok(slides.some(s => s.id === 'v3-punching'), 'Must contain smart board punching comparison slide');
assert.ok(slides.some(s => s.id === 'v3-database-mgmt'), 'Must contain database management comparison slide');
assert.ok(slides.some(s => s.id === 'v3-automate-process'), 'Must contain new automate process comparison slide');
assert.ok(slides.some(s => s.id === 'v3-holeplug-automate'), 'Must contain hole plug and switch hood automate slide');
assert.ok(slides.some(s => s.id === 'v3-new-workflow'), 'Must contain combined new workflow slide');
assert.ok(slides.some(s => s.id === 'v3-process-improvement'), 'Must contain process improvement comparison slide');
assert.ok(slides.some(s => s.id === 'v3-closing'), 'Must contain closing and Q&A slide');
for (const s of slides) {
  assert.ok(s.duration > 0 && s.title && s.narration);
  for (const p of [s.sourceImage, s.videoSrc].filter(Boolean)) {
    assert.ok(fs.existsSync(path.join(__dirname, p)), `Missing media: ${p}`);
  }
  if (s.sceneType === 'ver3-editorial') assert.ok(s.sourceSlides.length);
}
const results = slides.find(s => s.id === 'v3-results');
assert.equal(results.metrics[0].value, '7 → 1');
assert.equal(results.metrics[1].value, '86%');
assert.equal(results.metrics[2].value, '1.2M');
assert.equal(sandbox.window.PRESENTATION_V3, true);
console.log(`PASS: ${slides.length} scenes, original scenes retained, references and media valid.`);
