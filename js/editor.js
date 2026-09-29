/* ============================================================
   editor.js — РЕДАКТИРОВАНИЕ
   Все изменения состояния идут через App.setState(mutator) →
   renderAll → save. «Живой предпросмотр» (drag/resize, слайдеры,
   ввод текста) пишет в модель и узел напрямую внутри жеста,
   коммит жеста — через setState.
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const state = App.state;
const SLIDE_W = App.SLIDE_W;
const SLIDE_H = App.SLIDE_H;
const uid = App.uid;
const slideOf = App.slideOf;
const findEl = App.findEl;
const normalizeZ = App.normalizeZ;
const setState = App.setState;
const R = App.render;
const $ = R.$;
const $$ = R.$$;
const toast = R.toast;
const elNode = R.elNode;
const activeScale = R.activeScale;
const setTextSafe = R.setTextSafe;

/* ============================================================
   ВЫДЕЛЕНИЕ / ПРАВКА ТЕКСТА
   ============================================================ */

/* масштаб для жестов: 0 / отрицательный / NaN → 1:1 */
function gestureScale() {
  const s = activeScale();
  return Number.isFinite(s) && s > 0.02 ? s : 1;
}

/* запись правленого текста в модель — без рендера (для мутаторов) */
function flushCommit() {
  if (!state.ui.editingId) return;
  const id = state.ui.editingId;
  const node = elNode(id);
  const e = findEl(id);
  state.ui.editingId = null;
  if (node) {
    node.removeAttribute('contenteditable');
    node.classList.remove('editing');
    if (e) {
      const raw = node.innerText != null ? node.innerText : node.textContent;
      e.props.text = String(raw).replace(/\n$/, '');
      if (node.offsetHeight > 0) e.h = node.offsetHeight;
    }
  }
}

function commitEdit() {
  setState(() => flushCommit());
}

function select(id) {
  setState(() => {
    if (state.ui.editingId && state.ui.editingId !== id) flushCommit();
    if (id && !findEl(id)) id = null;
    state.ui.selected = id;
  });
}

function startEdit(id) {
  const e = findEl(id);
  if (!e || e.type !== 'text') return;
  const node = elNode(id);
  if (!node) return;
  setState(() => { state.ui.editingId = id; });
  node.classList.add('editing');
  node.setAttribute('contenteditable', 'true');
  node.style.whiteSpace = 'pre-wrap';
  node.focus();
  // выделяем весь текст
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  node.addEventListener('blur', () => commitEdit(), { once: true });
  node.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape') { node.blur(); }
  });
}

/* ============================================================
   DRAG / RESIZE
   ============================================================ */
function bindNodeEvents(node, handle, ref) {
  // закрываемся только по id: после undo/redo (и импорта) project
  // заменяется новыми объектами, старые ссылки открепляются
  const id = ref.id;

  node.addEventListener('pointerdown', ev => {
    const e = findEl(id);
    if (!e) return;
    if (ev.button > 0) return;                // только левая кнопка
    if (state.ui.editingId === e.id) return;   // идёт редактирование текста
    if (ev.target === handle) return;          // ресайз — отдельно
    ev.stopPropagation();
    if (state.ui.selected !== e.id) select(e.id);

    const startX = ev.clientX, startY = ev.clientY;
    const ox = e.x, oy = e.y;
    let moved = false;
    const win = node.ownerDocument.defaultView || window;
    if (node.setPointerCapture && ev.pointerId != null) {
      try { node.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    const onMove = mv => {
      const sc = gestureScale();
      const dx = (mv.clientX - startX) / sc;
      const dy = (mv.clientY - startY) / sc;
      if (!moved && Math.hypot(dx, dy) < 2) return;  // порог: клик ≠ перетаскивание
      moved = true;
      // живой предпросмотр внутри жеста (узел не пересоздаётся)
      e.x = Math.round(Math.max(-(e.w - 40), Math.min(SLIDE_W - 40, ox + dx)));
      e.y = Math.round(Math.max(-20, Math.min(SLIDE_H - 30, oy + dy)));
      const live = elNode(e.id) || node;
      live.style.left = e.x + 'px';
      live.style.top = e.y + 'px';
      R.positionToolbar();
    };
    // слушаем на window: жест переживает выход курсора за пределы узла
    // и окна (в браузере дополнительно помогает setPointerCapture)
    const end = () => {
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', end);
      win.removeEventListener('pointercancel', end);
      win.removeEventListener('lostpointercapture', end);
      if (moved) setState();   // коммит жеста — одна запись истории
    };
    win.addEventListener('pointermove', onMove);
    win.addEventListener('pointerup', end);
    win.addEventListener('pointercancel', end);
    win.addEventListener('lostpointercapture', end);
  });

  // двойной клик — редактирование текста
  node.addEventListener('dblclick', ev => {
    ev.stopPropagation();
    const cur = findEl(id);
    if (cur && cur.type === 'text') startEdit(cur.id);
  });

  // ресайз
  handle.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.button > 0) return;                 // только левая кнопка
    const cur = findEl(id);
    if (!cur) return;
    if (state.ui.selected !== cur.id) select(cur.id);
    const startX = ev.clientX, startY = ev.clientY;
    const ow = cur.w, oh = cur.h || 0;
    const win = handle.ownerDocument.defaultView || window;
    if (handle.setPointerCapture && ev.pointerId != null) {
      try { handle.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    const onMove = mv => {
      const sc = gestureScale();
      const dx = (mv.clientX - startX) / sc;
      const live = elNode(id) || node;
      if (cur.type === 'text') {
        cur.w = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dx)));
        live.style.width = cur.w + 'px';
      } else if (cur.type === 'image') {
        const nw = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dx)));
        const ar = cur.props.ar || (ow / oh) || 1;
        cur.w = nw;
        cur.h = Math.round(nw / ar);
        live.style.width = cur.w + 'px';
        live.style.height = cur.h + 'px';
      } else {
        const dy = (mv.clientY - startY) / sc;
        cur.w = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dx)));
        cur.h = Math.round(Math.max(40, Math.min(SLIDE_H, oh + dy)));
        live.style.width = cur.w + 'px';
        live.style.height = cur.h + 'px';
      }
      R.positionToolbar();
    };
    const onUp = () => {
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onUp);
      win.removeEventListener('lostpointercapture', onUp);
      setState();   // коммит жеста
    };
    win.addEventListener('pointermove', onMove);
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onUp);
    win.addEventListener('lostpointercapture', onUp);
  });
}

/* ============================================================
   CRUD ЭЛЕМЕНТОВ
   ============================================================ */
function addText() {
  const e = App.makeText({
    x: 200, y: 280, w: 520, h: 60,
    text: 'Новый текст',
    color: state.project.theme === 'glass' ? '#1c1c1e' : '#eafcff',
  });
  setState(() => {
    flushCommit();
    const arr = slideOf().elements;
    arr.push(e);
    normalizeZ(slideOf());
    state.ui.selected = e.id;
  });
  toast('Текст добавлен — двойной клик для правки');
  setTimeout(() => startEdit(e.id), 60);
}

function addBlock() {
  const e = App.makeBlock({
    x: 300, y: 240, w: 420, h: 240,
    radius: 22,
    fill: state.project.theme === 'glass' ? 'rgba(255,255,255,.55)' : 'rgba(0,240,255,.10)',
  });
  setState(() => {
    flushCommit();
    const arr = slideOf().elements;
    arr.push(e);
    normalizeZ(slideOf());
    state.ui.selected = e.id;
  });
}

function addImageFromSrc(src, ar) {
  const w = 460;
  const h = Math.round(w / (ar || 16 / 9));
  const e = App.makeImage({
    x: Math.round(640 - w / 2 + (slideOf().elements.length % 3) * 18),
    y: Math.round(300 - h / 2),
    w, h, radius: 24, src, ar,
  });
  setState(() => {
    flushCommit();
    const arr = slideOf().elements;
    arr.push(e);
    normalizeZ(slideOf());
    state.ui.selected = e.id;
  });
}

function duplicateEl(id) {
  setState(() => {
    flushCommit();
    const src = findEl(id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.x += 28; copy.y += 28;
    const arr = slideOf().elements;
    arr.push(copy);
    normalizeZ(slideOf());
    state.ui.selected = copy.id;
  });
}

function deleteEl(id) {
  const s = slideOf();
  if (!s.elements.some(e => e.id === id)) return;
  setState(() => {
    flushCommit();
    const arr = slideOf().elements;
    const i = arr.findIndex(e => e.id === id);
    if (i >= 0) arr.splice(i, 1);
    normalizeZ(slideOf());
    state.ui.selected = null;
  });
}

function layerEl(id, dir) {
  const arr = slideOf().elements;
  const i = arr.findIndex(e => e.id === id);
  if (i < 0) return;
  const j = dir === 'up' ? i + 1 : i - 1;
  if (j < 0 || j >= arr.length) return;
  setState(() => {
    flushCommit();
    const a = slideOf().elements;
    const k = a.findIndex(e => e.id === id);
    const m = dir === 'up' ? k + 1 : k - 1;
    if (k < 0 || m < 0 || m >= a.length) return;
    [a[k], a[m]] = [a[m], a[k]];
    normalizeZ(slideOf());
    state.ui.selected = id;
  });
}

/* ============================================================
   CRUD СЛАЙДОВ
   ============================================================ */
function addSlide() {
  const slide = App.makeSlide([
    App.makeText({
      x: 60, y: 46, w: 900, h: 70,
      text: 'Заголовок слайда', fontSize: 56, weight: 900,
      color: state.project.theme === 'glass' ? '#1c1c1e' : '#eafcff',
    }),
  ]);
  setState(() => {
    flushCommit();
    state.project.slides.push(slide);
    state.ui.current = state.project.slides.length - 1;
    state.ui.selected = null;
  });
  toast('Слайд добавлен');
}

function duplicateSlide(i) {
  setState(() => {
    flushCommit();
    const copy = JSON.parse(JSON.stringify(state.project.slides[i]));
    copy.id = uid();
    copy.elements.forEach(e => e.id = uid());
    state.project.slides.splice(i + 1, 0, copy);
    state.ui.current = i + 1;
    state.ui.selected = null;
  });
}

function deleteSlide(i) {
  if (state.project.slides.length === 1) { toast('Нельзя удалить последний слайд'); return; }
  setState(() => {
    flushCommit();
    state.project.slides.splice(i, 1);
    state.ui.current = Math.min(state.ui.current, state.project.slides.length - 1);
    if (state.ui.current === i) state.ui.current = Math.max(0, i - 1);
    state.ui.selected = null;
  });
}

function gotoSlide(i) {
  setState(() => {
    flushCommit();
    state.ui.current = i;
    state.ui.selected = null;
  });
}

/* ============================================================
   ПАНЕЛЬ СВОЙСТВ
   ============================================================ */
const SWATCHES = ['#ffffff', '#eafcff', '#9beaff', '#00f0ff', '#ff2bd6', '#ffd166', '#1c1c1e', '#0a84ff'];
const BG_PRESETS = [
  { css: '', preview: 'linear-gradient(135deg,#07041a,#1a0b3d)' },
  { css: 'linear-gradient(135deg,#667eea,#764ba2)', preview: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { css: 'linear-gradient(135deg,#f093fb,#f5576c)', preview: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { css: 'linear-gradient(135deg,#4facfe,#00f2fe)', preview: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { css: 'linear-gradient(135deg,#43e97b,#38f9d7)', preview: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { css: 'linear-gradient(135deg,#fa709a,#fee140)', preview: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { css: 'linear-gradient(135deg,#30cfd0,#330867)', preview: 'linear-gradient(135deg,#30cfd0,#330867)' },
  { css: '#0b0b1a', preview: '#0b0b1a' },
];
const FONTS = [
  { v: '', l: 'Системный' },
  { v: 'Georgia, serif', l: 'Классика (Georgia)' },
  { v: '"Courier New", monospace', l: 'Моноширинный' },
  { v: '"Trebuchet MS", sans-serif', l: 'Trebuchet' },
];

function renderProps() {
  const panel = $('#propsPanel');
  if (!panel) return;
  const e = state.ui.selected ? findEl(state.ui.selected) : null;

  if (!e) { renderBaseProps(panel); return; }
  if (e.type === 'text') renderTextProps(panel, e);
  else if (e.type === 'image') renderImageProps(panel, e);
  else renderBlockProps(panel, e);
}

/* Панель «ничего не выбрано»: добавление, фон слайда, операции со слайдом */
function renderBaseProps(panel) {
  panel.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title">Добавить на слайд</div>
      <div class="seg-group">
        <button class="seg-btn" data-a="text">＋ Текст</button>
        <button class="seg-btn" data-a="image">＋ Фото</button>
      </div>
      <div class="seg-group">
        <button class="seg-btn" data-a="block">＋ Блок</button>
        <button class="seg-btn" data-a="slide">＋ Слайд</button>
      </div>
    </div>

    <div class="prop-group">
      <div class="prop-group-title">Фон слайда</div>
      <div class="swatches" id="bgSwatches">
        ${BG_PRESETS.map((p, i) =>
          `<div class="swatch ${slideOf().bg === p.css ? 'active' : ''}" data-i="${i}" style="background:${p.preview}" title="Фон ${i + 1}"></div>`).join('')}
      </div>
    </div>

    <div class="prop-group">
      <div class="prop-group-title">Слайд ${state.ui.current + 1}</div>
      <div class="seg-group">
        <button class="seg-btn" data-a="dup-slide">⧉ Дублировать</button>
        <button class="seg-btn" data-a="del-slide">✕ Удалить</button>
      </div>
    </div>

    <div class="empty-props">
      <span class="big">🖱</span>
      Выбери элемент на слайде,<br>чтобы изменить его свойства.<br><br>
      Двойной клик по тексту —<br>редактировать содержимое.
    </div>`;

  panel.querySelector('[data-a="text"]').onclick = addText;
  panel.querySelector('[data-a="image"]').onclick = () => pickImage(false);
  panel.querySelector('[data-a="block"]').onclick = addBlock;
  panel.querySelector('[data-a="slide"]').onclick = addSlide;
  panel.querySelector('[data-a="dup-slide"]').onclick = () => duplicateSlide(state.ui.current);
  panel.querySelector('[data-a="del-slide"]').onclick = () => deleteSlide(state.ui.current);
  panel.querySelectorAll('#bgSwatches .swatch').forEach(sw => {
    sw.onclick = () => {
      const bg = BG_PRESETS[+sw.dataset.i].css;
      setState(() => { flushCommit(); slideOf().bg = bg; });
    };
  });
}

function renderTextProps(panel, e) {
  panel.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title">Текст</div>
      <textarea class="prop-input prop-full" id="pText" rows="4" style="width:100%;resize:vertical;line-height:1.4"></textarea>
    </div>

    <div class="prop-group">
      <div class="prop-group-title">Шрифт</div>
      <div class="prop-row">
        <label>Размер</label>
        <input type="range" id="pSize" min="10" max="120" value="${e.props.fontSize}">
        <output id="pSizeOut">${e.props.fontSize}</output>
      </div>
      <div class="prop-row">
        <label>Начертание</label>
        <div class="seg-group" style="flex:1.2">
          <button class="seg-btn ${e.props.weight >= 700 ? 'active' : ''}" id="pBold"><b>B</b></button>
          <button class="seg-btn ${e.props.italic ? 'active' : ''}" id="pItalic"><i>I</i></button>
        </div>
      </div>
      <div class="prop-row">
        <label>Шрифт</label>
        <select class="prop-select" id="pFont">
          ${FONTS.map(f => `<option value="${f.v}" ${e.props.fontFamily === f.v ? 'selected' : ''}>${f.l}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row">
        <label>Выравнивание</label>
        <div class="seg-group" style="flex:1.2">
          <button class="seg-btn ${e.props.align === 'left' ? 'active' : ''}" data-al="left">⇤</button>
          <button class="seg-btn ${e.props.align === 'center' ? 'active' : ''}" data-al="center">≡</button>
          <button class="seg-btn ${e.props.align === 'right' ? 'active' : ''}" data-al="right">⇥</button>
        </div>
      </div>
      <div class="prop-row">
        <label>Цвет</label>
        <input type="color" id="pColor" value=${/^#[0-9a-f]{6}$/i.test(e.props.color) ? `"${e.props.color}"` : '"#ffffff"'}>
      </div>
      <div class="swatches" id="pSw">
        ${SWATCHES.map(c => `<div class="swatch" data-c="${c}" style="background:${c}"></div>`).join('')}
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.props.opacity ?? 1) * 100)}">
      </div>
    </div>

    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const ta = panel.querySelector('#pText');
  ta.value = e.props.text;
  // живой предпросмотр: пока пользователь печатает, панель не пересобираем
  ta.addEventListener('input', () => {
    e.props.text = ta.value;
    const node = elNode(e.id);
    if (node) setTextSafe(node, e.props.text);
    scheduleThumbSave();
  });
  ta.addEventListener('change', () => setState());   // коммит ввода

  bindRange(panel, '#pSize', '#pSizeOut', v => {
    e.props.fontSize = +v;
    applyTextStyle(e);
  });
  bindRange(panel, '#pOpacity', null, v => { e.props.opacity = v / 100; applyTextStyle(e); });

  panel.querySelector('#pBold').onclick = () => {
    const w = e.props.weight >= 700 ? 400 : 800;
    setState(() => { e.props.weight = w; });
  };
  panel.querySelector('#pItalic').onclick = () => {
    setState(() => { e.props.italic = !e.props.italic; });
  };
  panel.querySelector('#pFont').onchange = ev => {
    const ff = ev.target.value;
    setState(() => { e.props.fontFamily = ff; });
  };
  panel.querySelectorAll('[data-al]').forEach(b => {
    b.onclick = () => { const al = b.dataset.al; setState(() => { e.props.align = al; }); };
  });
  panel.querySelector('#pColor').oninput = ev => { e.props.color = ev.target.value; applyTextStyle(e); };
  panel.querySelector('#pColor').addEventListener('change', () => setState());
  panel.querySelectorAll('#pSw .swatch').forEach(sw => {
    sw.onclick = () => { const c = sw.dataset.c; setState(() => { e.props.color = c; }); };
  });
  panel.querySelector('#pDup').onclick = () => duplicateEl(e.id);
  panel.querySelector('#pDel').onclick = () => deleteEl(e.id);
}

/* живой предпросмотр стиля текста (внутри жеста ввода/слайдера) */
function applyTextStyle(e) {
  const node = elNode(e.id);
  if (node) {
    node.style.fontSize = e.props.fontSize + 'px';
    node.style.color = e.props.color;
    node.style.fontWeight = e.props.weight;
    node.style.fontStyle = e.props.italic ? 'italic' : 'normal';
    node.style.textAlign = e.props.align;
    node.style.opacity = e.props.opacity ?? 1;
    node.style.fontFamily = e.props.fontFamily || '';
    node.style.width = e.w + 'px';
    if (node.offsetHeight > 0) e.h = node.offsetHeight;
  }
  scheduleThumbSave();
}

function renderImageProps(panel, e) {
  panel.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title">Фотография</div>
      <div class="seg-group">
        <button class="seg-btn" id="pReplace">⇄ Заменить</button>
        <button class="seg-btn" id="pBg" style="color:#ffd166">✨ Удалить фон</button>
      </div>
      ${e.props.originalSrc ? `<button class="seg-btn" id="pRestore" style="width:100%">⟲ Вернуть оригинал</button>` : ''}
    </div>

    <div class="prop-group">
      <div class="prop-group-title">Внешний вид</div>
      <div class="prop-row">
        <label>Скругление</label>
        <input type="range" id="pRadius" min="0" max="70" value="${e.props.radius || 0}">
      </div>
      <div class="prop-row">
        <label>Ширина</label>
        <input type="range" id="pW" min="80" max="900" value="${e.w}">
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.props.opacity ?? 1) * 100)}">
      </div>
    </div>

    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const nodeOf = () => elNode(e.id);

  panel.querySelector('#pReplace').onclick = () => pickImage(true, e.id);
  panel.querySelector('#pBg').onclick = () => openBgModal(e.id);
  const rest = panel.querySelector('#pRestore');
  if (rest) rest.onclick = () => {
    setState(() => {
      e.props.src = e.props.originalSrc;
      e.props.originalSrc = null;
    });
    toast('Оригинал восстановлен');
  };

  bindRange(panel, '#pRadius', null, v => {
    e.props.radius = +v; const n = nodeOf(); if (n) n.style.borderRadius = v + 'px';
  });
  bindRange(panel, '#pW', null, v => {
    const nw = +v; const ar = e.props.ar || (e.w / e.h) || 1;
    e.w = nw; e.h = Math.round(nw / ar);
    const n = nodeOf();
    if (n) { n.style.width = e.w + 'px'; n.style.height = e.h + 'px'; }
    R.positionToolbar();
  });
  bindRange(panel, '#pOpacity', null, v => {
    e.props.opacity = v / 100; const n = nodeOf(); if (n) n.style.opacity = e.props.opacity;
  });
  panel.querySelector('#pDup').onclick = () => duplicateEl(e.id);
  panel.querySelector('#pDel').onclick = () => deleteEl(e.id);
}

function renderBlockProps(panel, e) {
  panel.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title">Блок</div>
      <div class="prop-row">
        <label>Цвет</label>
        <input type="color" id="pFill" value="${/^#[0-9a-f]{6}$/i.test(e.props.fill) ? e.props.fill : '#4facfe'}">
      </div>
      <div class="prop-row">
        <label>Скругление</label>
        <input type="range" id="pRadius" min="0" max="70" value="${e.props.radius || 22}">
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.props.opacity ?? 1) * 100)}">
      </div>
    </div>
    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const nodeOf = () => elNode(e.id);
  panel.querySelector('#pFill').oninput = ev => {
    e.props.fill = ev.target.value;
    const n = nodeOf(); if (n) n.style.background = e.props.fill;
    scheduleThumbSave();
  };
  panel.querySelector('#pFill').addEventListener('change', () => setState());
  bindRange(panel, '#pRadius', null, v => {
    e.props.radius = +v; const n = nodeOf(); if (n) n.style.borderRadius = v + 'px';
  });
  bindRange(panel, '#pOpacity', null, v => {
    e.props.opacity = v / 100; const n = nodeOf(); if (n) n.style.opacity = e.props.opacity;
  });
  panel.querySelector('#pDup').onclick = () => duplicateEl(e.id);
  panel.querySelector('#pDel').onclick = () => deleteEl(e.id);
}

/* слайдер: input — живой предпросмотр, change — коммит через setState */
function bindRange(panel, sel, outSel, fn) {
  const inp = panel.querySelector(sel);
  if (!inp) return;
  const out = outSel ? panel.querySelector(outSel) : null;
  inp.addEventListener('input', () => {
    if (out) out.textContent = inp.value;
    fn(inp.value);
  });
  inp.addEventListener('change', () => setState());
}

/* отложенное обновление миниатюр для «живых» правок */
let thumbTimer = null;
function scheduleThumbSave() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => { R.renderThumbs(); App.storage.save(); }, 400);
}

/* ============================================================
   ЗАГРУЗКА ИЗОБРАЖЕНИЙ
   ============================================================ */
let replaceTargetId = null;
function pickImage(replacing, id) {
  replaceTargetId = replacing ? id : null;
  const inp = $('#fileImage');
  inp.value = '';
  inp.click();
}

function processFile(file, cb) {
  if (!file || !file.type.startsWith('image/')) { toast('Нужен файл изображения'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1600;
      let { width: w, height: h } = img;
      const k = Math.min(1, maxSide / Math.max(w, h));
      w = Math.round(w * k); h = Math.round(h * k);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      cb(cv.toDataURL(type, 0.86), w / h);
    };
    img.onerror = () => toast('Не удалось прочитать изображение');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function bindImageInput() {
  $('#fileImage').addEventListener('change', ev => {
    const file = ev.target.files[0];
    if (!file) return;
    processFile(file, (src, ar) => {
      if (replaceTargetId) {
        const target = replaceTargetId;
        replaceTargetId = null;
        const e = findEl(target);
        if (e) {
          setState(() => {
            if (!e.props.originalSrc) e.props.originalSrc = e.props.src;
            e.props.src = src; e.props.ar = ar;
            e.w = 460; e.h = Math.round(460 / ar);
            state.ui.selected = e.id;
          });
          toast('Фото заменено');
        }
      } else {
        addImageFromSrc(src, ar);
        toast('Фото добавлено — попробуй «✨ Удалить фон»');
      }
    });
  });

  /* drag & drop на слайд */
  document.addEventListener('dragover', ev => ev.preventDefault());
  document.addEventListener('drop', ev => {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) processFile(file, (src, ar) => { addImageFromSrc(src, ar); toast('Фото добавлено'); });
  });
}

/* ============================================================
   УДАЛЕНИЕ ФОНА (flood-fill от краёв)
   ============================================================ */
let bgTargetId = null;
let bgSourceImg = null;

function openBgModal(id) {
  const e = findEl(id);
  if (!e || e.type !== 'image') return;
  bgTargetId = id;
  const img = new Image();
  img.onload = () => {
    bgSourceImg = img;
    setState(() => { state.ui.bgModal = true; });
    drawBgPreview();
  };
  img.onerror = () => toast('Изображение недоступно для обработки');
  img.src = e.props.src;
}

function closeBgModal() {
  setState(() => {
    state.ui.bgModal = false;
    bgTargetId = null;
    bgSourceImg = null;
  });
}

function drawBgPreview() {
  if (!bgSourceImg) return;
  const tol = +$('#bgTolerance').value;
  const feather = $('#bgFeather').checked;
  const result = removeBg(bgSourceImg, tol, feather);
  const cv = $('#bgPreview');
  cv.width = result.width;
  cv.height = result.height;
  cv.getContext('2d').drawImage(result, 0, 0);
}

function removeBg(img, tolPercent, feather) {
  const maxSide = 1400;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const k = Math.min(1, maxSide / Math.max(w, h));
  w = Math.max(1, Math.round(w * k));
  h = Math.max(1, Math.round(h * k));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const N = w * h;

  // средний цвет рамки = кандидат в фон
  let sr = 0, sg = 0, sb = 0, sc = 0;
  const sample = (x, y) => {
    const i = (y * w + x) * 4;
    sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sc++;
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
  const br = sr / sc, bg = sg / sc, bb = sb / sc;

  const T = 34 + tolPercent * 2.1;        // порог до «своего» фона
  const STEP = 14 + tolPercent * 0.30;    // локальная непрерывность (градиенты)
  const T2 = T * 1.55;
  const distBG = i =>
    Math.sqrt((d[i] - br) ** 2 + (d[i + 1] - bg) ** 2 + (d[i + 2] - bb) ** 2);

  const mask = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;

  const tryPush = p => {
    if (mask[p]) return;
    const i = p * 4;
    if (distBG(i) <= T) { mask[p] = 1; stack[sp++] = p; }
  };
  for (let x = 0; x < w; x++) { tryPush(x); tryPush((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { tryPush(y * w); tryPush(y * w + w - 1); }

  const distPix = (p, q) => {
    const i = p * 4, j = q * 4;
    return Math.sqrt((d[i] - d[j]) ** 2 + (d[i + 1] - d[j + 1]) ** 2 + (d[i + 2] - d[j + 2]) ** 2);
  };

  while (sp > 0) {
    const p = stack[--sp];
    const px = p % w, py = (p / w) | 0;
    // 4-соседа
    for (let n = 0; n < 4; n++) {
      let nx = px, ny = py;
      if (n === 0) nx--; else if (n === 1) nx++;
      else if (n === 2) ny--; else ny++;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (mask[q]) continue;
      const dq = distBG(q * 4);
      if (dq <= T || (dq <= T2 && distPix(p, q) <= STEP)) {
        mask[q] = 1;
        stack[sp++] = q;
      }
    }
  }

  // сглаживание краёв + применение маски
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (mask[p]) { d[i + 3] = 0; continue; }
    if (!feather) continue;
    const px = p % w, py = (p / w) | 0;
    let touches = false;
    if (px > 0 && mask[p - 1]) touches = true;
    if (!touches && px < w - 1 && mask[p + 1]) touches = true;
    if (!touches && py > 0 && mask[p - w]) touches = true;
    if (!touches && py < h - 1 && mask[p + w]) touches = true;
    if (touches) {
      const dd = distBG(i);
      if (dd < T * 1.5) {
        const a = Math.max(0, Math.min(1, (dd - T) / Math.max(1, T * 0.5)));
        d[i + 3] = Math.min(d[i + 3], Math.round(a * 255));
      }
    }
  }

  ctx.putImageData(id, 0, 0);
  return cv;
}

function applyBgRemoval() {
  const e = findEl(bgTargetId);
  if (!e || !bgSourceImg) return;
  const tol = +$('#bgTolerance').value;
  const feather = $('#bgFeather').checked;
  const result = removeBg(bgSourceImg, tol, feather);
  const out = result.toDataURL('image/png');
  setState(() => {
    if (!e.props.originalSrc) e.props.originalSrc = e.props.src;
    e.props.src = out;
    state.ui.bgModal = false;
    bgTargetId = null;
    bgSourceImg = null;
  });
  toast('Фон удалён ✨');
}

function bindBgModal() {
  let bgRaf = null;
  $('#bgTolerance').addEventListener('input', ev => {
    $('#bgToleranceOut').textContent = ev.target.value;
    cancelAnimationFrame(bgRaf);
    bgRaf = requestAnimationFrame(drawBgPreview);
  });
  $('#bgFeather').addEventListener('change', drawBgPreview);
  $('#bgCancel').addEventListener('click', closeBgModal);
  $('#bgApply').addEventListener('click', applyBgRemoval);
  $('#bgModal').addEventListener('click', ev => {
    if (ev.target === $('#bgModal')) $('#bgCancel').click();
  });
}

/* ============================================================
   ПАНЕЛЬ ДЕЙСТВИЙ НАД ЭЛЕМЕНТОМ
   ============================================================ */
function bindElToolbar() {
  $('#elToolbar').addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    // поддерживаем оба атрибута: data-a и data-act
    const act = btn && (btn.dataset.a || btn.dataset.act);
    if (!act || !state.ui.selected) return;
    if (act === 'up')   layerEl(state.ui.selected, 'up');
    if (act === 'down') layerEl(state.ui.selected, 'down');
    if (act === 'dup')  duplicateEl(state.ui.selected);
    if (act === 'del')  deleteEl(state.ui.selected);
    if (act === 'bg')   openBgModal(state.ui.selected);
  });
}

/* ============================================================
   ТЕМЫ
   ============================================================ */
function setTheme(t) {
  setState(() => {
    flushCommit();
    if (state.project.theme !== t) App.remapTextColors(t);
    state.project.theme = t;
  });
}

function bindThemeSwitch() {
  $('#themeSwitch').addEventListener('click', ev => {
    const t = ev.target.dataset.theme;
    if (t) { setTheme(t); toast(t === 'neon' ? 'Стиль: Неон ⚡' : 'Стиль: Жидкое стекло ◈'); }
  });
}

/* ============================================================
   РЕЖИМ ПРЕЗЕНТАЦИИ
   ============================================================ */
function openPresent() {
  setState(() => {
    flushCommit();
    state.ui.selected = null;
    state.ui.present = true;
  });
  toast('Клик — дальше, ✏️ — редактировать прямо здесь, Esc — выход');
}

function closePresent() {
  setState(() => {
    flushCommit();
    state.ui.present = false;
    state.ui.presentEdit = false;
    state.ui.selected = null;
  });
}

function togglePresentEdit() {
  const turningOff = state.ui.presentEdit;
  setState(() => {
    if (turningOff) {
      flushCommit();
      state.ui.selected = null;
    }
    state.ui.presentEdit = !turningOff;
  });
  if (state.ui.presentEdit) {
    toast('✏️ Редактирование: клик — выбрать, двойной клик — правка текста');
  } else {
    toast('👀 Просмотр: клик — следующий слайд');
  }
}

function presentStep(d) {
  const n = state.ui.current + d;
  if (n < 0 || n >= state.project.slides.length) return;
  setState(() => {
    flushCommit();
    state.ui.current = n;   // редактор и поиск элементов всегда на том же слайде
    state.ui.selected = null;
  });
}

function bindPresent() {
  $('#btnPresent').addEventListener('click', openPresent);
  $('#pClose').addEventListener('click', closePresent);
  $('#pNext').addEventListener('click', () => presentStep(1));
  $('#pPrev').addEventListener('click', () => presentStep(-1));
  $('#pEdit').addEventListener('click', togglePresentEdit);
  $('#present').addEventListener('click', ev => {
    if (ev.target.closest('.present-controls')) return;
    if (state.ui.presentEdit) {
      // в режиме редактирования клик по пустому месту снимает выделение
      if (!ev.target.closest('.el')) select(null);
      return;
    }
    presentStep(1);
  });
}

/* ============================================================
   КЛАВИАТУРА
   ============================================================ */
/* Ctrl+Z / Ctrl+Y (и Ctrl+Shift+Z) — в полях ввода работает нативный undo */
function tryUndoRedo(ev) {
  if (!(ev.ctrlKey || ev.metaKey)) return false;
  const k = ev.key.toLowerCase();
  if (k === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    if (!App.undo()) toast('Нечего отменять');
    return true;
  }
  if (k === 'y' || (ev.shiftKey && k === 'z')) {
    ev.preventDefault();
    if (!App.redo()) toast('Нечего повторять');
    return true;
  }
  return false;
}

function bindKeyboard() {
  document.addEventListener('keydown', ev => {
    const t = ev.target;
    const inField = !!(t && typeof t.matches === 'function' &&
                       (t.matches('input, textarea, select') || t.isContentEditable));

    // режим презентации
    if (App.render.presentOpen()) {
      if (ev.key === 'F5') { ev.preventDefault(); return; }
      if (inField) {
        // фокус в поле свойств справа — Esc просто снимает фокус
        if (ev.key === 'Escape') ev.target.blur();
        return;
      }
      if (tryUndoRedo(ev)) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (state.ui.selected) { select(null); return; }          // сначала снять выделение
        if (state.ui.presentEdit) { togglePresentEdit(); return; } // затем выйти из редактирования
        closePresent();                                            // затем закрыть презентацию
        return;
      }

      // редактирование: Delete / дублирование / сдвиг стрелками
      if (state.ui.presentEdit && state.ui.selected) {
        const id = state.ui.selected;
        const e = findEl(id);
        if (e) {
          if (ev.key === 'Delete' || ev.key === 'Backspace') {
            ev.preventDefault(); deleteEl(id); return;
          }
          if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
            ev.preventDefault(); duplicateEl(id); return;
          }
          if (ev.key.startsWith('Arrow')) {
            ev.preventDefault();
            const step = ev.shiftKey ? 20 : 4;
            setState(() => {
              if (ev.key === 'ArrowLeft')  e.x -= step;
              if (ev.key === 'ArrowRight') e.x += step;
              if (ev.key === 'ArrowUp')    e.y -= step;
              if (ev.key === 'ArrowDown')  e.y += step;
            });
            return;
          }
        }
      }

      // навигация по слайдам
      if (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'PageDown') { presentStep(1); ev.preventDefault(); }
      if (ev.key === 'ArrowLeft'  || ev.key === 'PageUp') { presentStep(-1); ev.preventDefault(); }
      return;
    }

    if (ev.key === 'F5' && !inField) {
      ev.preventDefault();
      openPresent();
      return;
    }

    if (inField) return;

    // модалка фона (DOM синхронизируется из state через syncChrome)
    if (!$('#bgModal').classList.contains('hidden')) {
      if (ev.key === 'Escape') $('#bgCancel').click();
      return;
    }

    if (tryUndoRedo(ev)) return;

    if (ev.key === 'Escape') { select(null); return; }

    const id = state.ui.selected;
    if (!id) return;
    const e = findEl(id);
    if (!e) return;

    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      deleteEl(id);
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
      ev.preventDefault();
      duplicateEl(id);
    } else if (ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      const step = ev.shiftKey ? 20 : 4;
      setState(() => {
        if (ev.key === 'ArrowLeft')  e.x -= step;
        if (ev.key === 'ArrowRight') e.x += step;
        if (ev.key === 'ArrowUp')    e.y -= step;
        if (ev.key === 'ArrowDown')  e.y += step;
      });
    }
  });
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  $('#btnAddSlide').addEventListener('click', addSlide);
  bindThemeSwitch();
  bindImageInput();
  bindBgModal();
  bindElToolbar();
  bindPresent();
  bindKeyboard();
  // изменение размеров окна — не изменение состояния, просто перерисовка
  window.addEventListener('resize', () => {
    if (App.render.presentOpen()) R.renderPresent();
    else R.fitStage();
    R.positionToolbar();
  });
}

App.editor = {
  select, startEdit, commitEdit, flushCommit, bindNodeEvents,
  addText, addBlock, addImageFromSrc, duplicateEl, deleteEl, layerEl,
  addSlide, duplicateSlide, deleteSlide, gotoSlide,
  renderProps, scheduleThumbSave, pickImage, processFile,
  openBgModal, closeBgModal, removeBg, drawBgPreview, applyBgRemoval,
  setTheme, openPresent, closePresent, togglePresentEdit, presentStep,
  init,
};

})(window.App);
