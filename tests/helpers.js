/* Общие фикстуры jsdom-тестов конструктора */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0, fail = 0;

function check(name, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  cond ? pass++ : fail++;
}

function finish() {
  console.log(`\nИтого: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

function makeDom(seed) {
  const dom = new JSDOM(html, {
    url: 'http://localhost:8000/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  const errs = [];
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = class PointerEvent extends window.MouseEvent {
      constructor(type, init = {}) {
        super(type, init);
        this.pointerId = init.pointerId != null ? init.pointerId : 0;
        this.pointerType = init.pointerType || 'mouse';
        this.isPrimary = init.isPrimary !== false;
        this.pressure = init.pressure != null ? init.pressure : 0.5;
      }
    };
  }
  window.addEventListener('error', e => errs.push(String(e.message || e.error)));
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      drawImage() {},
      getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
    };
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA';
  window.requestAnimationFrame = cb => setTimeout(cb, 0);
  window.cancelAnimationFrame = id => clearTimeout(id);
  if (seed) for (const k in seed) window.localStorage.setItem(k, seed[k]);
  for (const f of ['state.js', 'storage.js', 'render.js', 'editor.js', 'export.js', 'app.js']) {
    window.eval(fs.readFileSync(path.join(root, 'js', f), 'utf8'));
  }
  return { window, errs };
}

/* jsdom без layout: задаём размеры зоны → fitStage даёт scale 1:1 */
function setStageScale(window, scale) {
  const area = window.document.querySelector('#stageArea');
  Object.defineProperty(area, 'clientWidth',  { value: 1280 * scale + 56, configurable: true });
  Object.defineProperty(area, 'clientHeight', { value: 720 * scale + 76, configurable: true });
}

module.exports = { check, finish, makeDom, setStageScale, root, html };
