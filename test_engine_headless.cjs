const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Mock DOM environment for headless engine test
class MockCanvas {
  constructor(id) {
    this.id = id;
    this.width = 1920;
    this.height = 1080;
    this.listeners = {};
  }
  getContext(type) {
    return {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 8 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      stroke: () => {},
      fill: () => {},
      setLineDash: () => {},
      roundRect: () => {}
    };
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1920, height: 1080 };
  }
  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  removeEventListener() {}
}

const canvas = new MockCanvas('stageCanvas');
const elements = { stageCanvas: canvas };

const mockDocument = {
  getElementById: (id) => elements[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return new MockCanvas();
    if (tag === 'video') return { src: '', play: () => Promise.resolve(), pause: () => {}, addEventListener: () => {} };
    if (tag === 'img') return { src: '', addEventListener: () => {} };
    return { style: {}, appendChild: () => {}, addEventListener: () => {} };
  },
  body: { classList: { toggle: () => {}, contains: () => false }, appendChild: () => {} },
  documentElement: { requestFullscreen: () => Promise.resolve() }
};

const sandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false }),
    location: { protocol: 'http:' },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    speechSynthesis: { speak: () => {}, cancel: () => {}, getVoices: () => [] },
    Audio: class { constructor() { this.src = ''; } play() { return Promise.resolve(); } pause() {} }
  },
  document: mockDocument,
  console: console,
  Image: class { constructor() { this.src = ''; } },
  performance: { now: () => 1000 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  Audio: class { constructor() { this.src = ''; } play() { return Promise.resolve(); } pause() {} }
};
sandbox.window.document = mockDocument;

vm.createContext(sandbox);

// 1. Run presentation data
vm.runInContext(fs.readFileSync(path.join(__dirname, 'presentation_data.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'presentation_v3_data.js'), 'utf8'), sandbox);

// 2. Run presentation app
const appCode = fs.readFileSync(path.join(__dirname, 'presentation_app.js'), 'utf8');
vm.runInContext(appCode, sandbox);

// 3. Test instantiation
const PresentationApp = sandbox.window.PresentationApp || sandbox.PresentationApp;
assert.ok(PresentationApp, 'PresentationApp class must exist');
const app = new PresentationApp();
assert.ok(app, 'PresentationApp must instantiate successfully without crashing on missing UI DOM');

// 4. Test lifecycle hooks
let timeFired = false;
let slideFired = false;
let playFired = false;

app.onTimeUpdate = (elapsed, total) => { timeFired = true; };
app.onSlideChange = (idx) => { slideFired = true; };
app.onPlayStateChange = (playing) => { playFired = true; };

app.selectSlide(2);
assert.equal(app.activeSlideIndex, 2);
assert.ok(slideFired, 'onSlideChange must fire');

app.play();
assert.equal(app.isPlaying, true);
assert.ok(playFired, 'onPlayStateChange must fire on play');

playFired = false;
app.pause();
assert.equal(app.isPlaying, false);
assert.ok(playFired, 'onPlayStateChange must fire on pause');

app.play();
app.tick(0.1);
assert.ok(timeFired, 'onTimeUpdate must fire on tick');
app.pause();

// 5. Test destroy
assert.ok(typeof app.destroy === 'function', 'app.destroy() method must exist');
app.destroy();

console.log('PASS: PresentationApp headless instantiation and lifecycle callbacks verified.');
