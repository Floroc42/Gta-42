const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = '/workspace/gta42';
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<script src="[^"]+"><\/script>/g, '').replace(/<link rel="stylesheet"[^>]*>/, '');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.innerWidth = 1280;
global.innerHeight = 800;
global.devicePixelRatio = 1;
global.localStorage = dom.window.localStorage;
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
global.performance = global.performance || dom.window.performance;

const ctx2dStub = () => new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return null;
    return (...a) => {
      if (k === 'measureText') return { width: 10 };
      if (k === 'getImageData') return { data: new Uint8ClampedArray(4) };
      return undefined;
    };
  },
  set() { return true; }
});
dom.window.HTMLCanvasElement.prototype.getContext = function () { return ctx2dStub(); };
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.SVGElement = dom.window.SVGElement;

const G0 = {}; dom.window.G = G0; global.G = G0;
const THREE = require(path.join(ROOT, 'vendor', 'three.min.js'))
THREE.WebGLRenderer = class {
  constructor() { this.domElement = document.getElementById('gl'); this.shadowMap = {}; this.outputEncoding = 0; this._pr = 1; }
  setPixelRatio(v) { this._pr = v; }
  getPixelRatio() { return this._pr; }
  setSize() {}
  render() {}
};
global.THREE = THREE;

const order = ['config', 'utils', 'save', 'audio', 'input', 'world', 'city', 'traffic', 'vehicle', 'character', 'missions', 'ui', 'main'];
for (const f of order) {
  const code = fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  try { eval(code); } catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}

const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = (code, type) => document.dispatchEvent(new dom.window.KeyboardEvent(type, { code, bubbles: true }));

(async () => {
  try { G.game.boot(); } catch (e) { console.error('BOOT FAIL', e.stack); process.exit(1); }
  await sleep(2500);
  console.log('STATE after boot:', G.game.state);
  console.log('city counts:', JSON.stringify({
    shops: G.city.bGeos.shops.length, res: G.city.bGeos.res.length, modern: G.city.bGeos.modern.length,
    solid: G.city.solidGeos.length, roads: G.city.roads.length, trees: G.city.treeList.length
  }));
  if (G.game.state !== 'menu') { console.error('not in menu'); }

  document.getElementById('btnPlay').click();
  await sleep(1200);
  console.log('STATE after play:', G.game.state, 'inCar:', G.player.inCar, 'pos:', G.player.pos.x.toFixed(1), G.player.pos.z.toFixed(1));
  const p0 = { x: G.player.pos.x, z: G.player.pos.z };

  key('KeyW', 'keydown');
  await sleep(1500);
  const walkSpeed = G.player.char.speed;
  key('KeyW', 'keyup');
  console.log('walk speed:', walkSpeed.toFixed(2), '(must be > 2)');

  G.player.char.pos.set(66, 0, 50);
  await sleep(250);
  key('KeyE', 'keydown'); key('KeyE', 'keyup');
  await sleep(400);
  console.log('entered car:', G.player.inCar, G.player.active && G.player.active.typeName);

  key('ArrowUp', 'keydown');
  await sleep(3000);
  key('ArrowLeft', 'keydown');
  await sleep(1000);
  key('ArrowLeft', 'keyup');
  await sleep(1000);
  key('ArrowUp', 'keyup');
  console.log('driving speed km/h:', (G.player.active.speed*3.6).toFixed(0), 'pos:', G.player.pos.x.toFixed(1), G.player.pos.z.toFixed(1), 'dmg:', G.player.active.damage.toFixed(0));

  key('KeyM', 'keydown'); key('KeyM', 'keyup');
  await sleep(300);
  key('KeyM', 'keydown'); key('KeyM', 'keyup');
  key('Escape', 'keydown'); key('Escape', 'keyup');
  await sleep(300);
  console.log('pause state:', G.game.state);
  key('Escape', 'keydown'); key('Escape', 'keyup');
  await sleep(300);
  console.log('resumed:', G.game.state);

  await page_night();
  function page_night() {
    G.world.tod = 23.5;
  }
  await sleep(600);
  console.log('night factor:', G.world.night.toFixed(2), 'tod:', G.world.tod.toFixed(1));

  await sleep(2000);
  console.log('final money:', G.save.data.money, 'mission:', G.missions.active && G.missions.active.id, 'step:', G.missions.stepIdx);
  console.log('ERRORS:', errors.length ? errors : 'none');
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.stack); process.exit(1); });

process.on('uncaughtException', e => { errors.push('UNCAUGHT: ' + (e.stack || e.message)); console.error('UNCAUGHT NOW:', e.stack || e.message); });
