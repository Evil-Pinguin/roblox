/* ============================================================
   RBLX Презентации — конструктор слайдов (day 1)
   ============================================================ */
(() => {
'use strict';

const SLIDE_W = 1280;
const SLIDE_H = 720;
const STORE_KEY = 'rblx-pres-v1';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let uidN = 1;
const uid = () => 'u' + (uidN++) + Date.now().toString(36).slice(-4);

/* ------------------------------------------------------------
   Состояние
------------------------------------------------------------ */
function defaultSlides() {
  return [
    {
      id: uid(), bg: '',
      elements: [
        { id: uid(), type: 'text', x: 60,  y: 46,  w: 720, fontSize: 58, weight: 900, italic: false, align: 'left', color: '#eafcff', opacity: 1, fontFamily: '', text: 'Регистрация в Roblox' },
        { id: uid(), type: 'text', x: 62,  y: 124, w: 640, fontSize: 25, weight: 500, italic: false, align: 'left', color: '#9beaff', opacity: .9, fontFamily: '', text: 'Создай аккаунт за 2 минуты' },
        { id: uid(), type: 'text', x: 64,  y: 208, w: 590, fontSize: 24, weight: 600, italic: false, align: 'left', color: '#ffffff', opacity: 1, fontFamily: '',
          text: '1.  Открой roblox.com\n2.  Нажми кнопку Sign Up\n3.  Укажи дату рождения\n4.  Придумай логин и пароль\n5.  Подтверди почту — готово!' },
        { id: uid(), type: 'image', x: 728, y: 178, w: 476, h: 261, radius: 26, opacity: 1, src: 'assets/img/character.png', originalSrc: null },
        { id: uid(), type: 'text', x: 64,  y: 620, w: 900, fontSize: 18, weight: 500, italic: true, align: 'left', color: '#9beaff', opacity: .75, fontFamily: '', text: 'Бесплатно · PC · мобильные · консоли' },
      ],
    },
    {
      id: uid(), bg: '',
      elements: [
        { id: uid(), type: 'text', x: 60,  y: 46,  w: 720, fontSize: 58, weight: 900, italic: false, align: 'left', color: '#eafcff', opacity: 1, fontFamily: '', text: 'Roblox Studio' },
        { id: uid(), type: 'text', x: 62,  y: 124, w: 640, fontSize: 25, weight: 500, italic: false, align: 'left', color: '#9beaff', opacity: .9, fontFamily: '', text: 'Создавай свои миры и игры' },
        { id: uid(), type: 'text', x: 64,  y: 208, w: 560, fontSize: 24, weight: 600, italic: false, align: 'left', color: '#ffffff', opacity: 1, fontFamily: '',
          text: '•  Мощный конструктор уровней\n•  Скрипты на языке Lua\n•  Свободная публикация игр\n•  Твоя игра — для миллионов игроков' },
        { id: uid(), type: 'image', x: 690, y: 172, w: 520, h: 285, radius: 26, opacity: 1, src: 'assets/img/studio.png', originalSrc: null },
        { id: uid(), type: 'text', x: 64,  y: 620, w: 900, fontSize: 18, weight: 500, italic: true, align: 'left', color: '#9beaff', opacity: .75, fontFamily: '', text: 'Скачай бесплатно с roblox.com/create' },
      ],
    },
  ];
}

const state = {
  theme: 'neon',
  slides: defaultSlides(),
  current: 0,
  selected: null,
};

let editingId = null;   // элемент, который сейчас редактируется текстом
let scale = 1;          // масштаб сцены 1280×720 → экран
let saveTimer = null;

const slideOf = () => state.slides[state.current];
const findEl  = id => slideOf().elements.find(e => e.id === id);

/* ------------------------------------------------------------
   Персистентность
------------------------------------------------------------ */
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        theme: state.theme,
        slides: state.slides,
        current: state.current,
      }));
    } catch (err) {
      toast('Не удалось сохранить: хранилище переполнено');
    }
  }, 350);
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.slides) && data.slides.length) {
      state.slides = data.slides;
      state.theme = data.theme === 'glass' ? 'glass' : 'neon';
      state.current = Math.min(data.current || 0, data.slides.length - 1);
    }
  } catch (err) { /* повреждённые данные — стартуем с дефолта */ }
}

/* ------------------------------------------------------------
   Тост
------------------------------------------------------------ */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------
   Рендер элементов
------------------------------------------------------------ */
function buildNode(e, interactive) {
  const div = document.createElement('div');
  div.className = 'el ' + e.type + (state.selected === e.id ? ' selected' : '');
  div.dataset.id = e.id;
  div.style.left = e.x + 'px';
  div.style.top  = e.y + 'px';
  div.style.opacity = e.opacity != null ? e.opacity : 1;

  if (e.type === 'text') {
    div.style.width = e.w + 'px';
    div.style.fontSize = e.fontSize + 'px';
    div.style.color = e.color;
    div.style.fontWeight = e.weight;
    div.style.fontStyle = e.italic ? 'italic' : 'normal';
    div.style.textAlign = e.align;
    if (e.fontFamily) div.style.fontFamily = e.fontFamily;
    div.textContent = e.text;
  } else if (e.type === 'image') {
    div.style.width  = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.radius || 0) + 'px';
    const img = document.createElement('img');
    img.src = e.src;
    img.alt = '';
    img.addEventListener('load', () => {
      if (!e.ar && img.naturalWidth) e.ar = img.naturalWidth / img.naturalHeight;
    });
    div.appendChild(img);
  } else if (e.type === 'block') {
    div.style.width  = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.radius || 22) + 'px';
    div.style.background = e.fill || 'rgba(127,127,127,.14)';
  }

  if (interactive) {
    const h = document.createElement('div');
    h.className = 'handle';
    div.appendChild(h);
    bindNodeEvents(div, h, e);
  }
  return div;
}

function makeScaler(slide, interactive) {
  const sc = document.createElement('div');
  sc.className = 'slide-scaler';
  slide.elements.forEach(e => sc.appendChild(buildNode(e, interactive)));
  return sc;
}

/* ------------------------------------------------------------
   Сцена
------------------------------------------------------------ */
function renderStage() {
  const stage = $('#stage');
  stage.innerHTML = '';
  const vp = document.createElement('div');
  vp.className = 'slide-frame slide-viewport';
  vp.id = 'stageViewport';
  if (slideOf().bg) vp.style.background = slideOf().bg;
  vp.appendChild(makeScaler(slideOf(), true));

  vp.addEventListener('pointerdown', ev => {
    if (ev.target === vp || ev.target.classList.contains('slide-scaler')) {
      select(null);
      commitEdit();
    }
  });
  stage.appendChild(vp);
  fitStage();
}

function fitStage() {
  const vp = $('#stageViewport');
  if (!vp) return;
  const area = $('#stageArea');
  const availW = area.clientWidth  - 56;
  const availH = area.clientHeight - 76;
  scale = Math.min(availW / SLIDE_W, availH / SLIDE_H, 1.15);
  const w = Math.round(SLIDE_W * scale);
  const h = Math.round(SLIDE_H * scale);
  vp.style.width  = w + 'px';
  vp.style.height = h + 'px';
  const sc = vp.querySelector('.slide-scaler');
  if (sc) sc.style.transform = `scale(${scale})`;
}

/* ------------------------------------------------------------
   Миниатюры слайдов
------------------------------------------------------------ */
function renderThumbs() {
  const list = $('#slidesList');
  list.innerHTML = '';
  state.slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slide-item';

    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (i === state.current ? ' active' : '');
    if (s.bg) thumb.style.background = s.bg;

    const inner = document.createElement('div');
    inner.className = 'thumb-inner';
    inner.appendChild(makeScaler(s, false));
    thumb.appendChild(inner);

    const num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = i + 1;
    thumb.appendChild(num);

    const acts = document.createElement('div');
    acts.className = 'slide-item-actions';
    acts.innerHTML = `
      <button data-a="dup" title="Дублировать">⧉</button>
      <button data-a="del" title="Удалить">✕</button>`;
    acts.addEventListener('click', ev => {
      ev.stopPropagation();
      const a = ev.target.closest('button')?.dataset.a;
      if (a === 'dup') duplicateSlide(i);
      if (a === 'del') deleteSlide(i);
    });
    item.appendChild(acts);

    thumb.addEventListener('click', () => {
      commitEdit();
      state.current = i;
      state.selected = null;
      renderAll();
      save();
    });

    item.insertBefore(thumb, acts);
    list.appendChild(item);

    const k = thumb.clientWidth / SLIDE_W;
    inner.style.transform = `scale(${k})`;
  });
}

/* ------------------------------------------------------------
   Выбор / редактирование текста
------------------------------------------------------------ */
function select(id) {
  if (editingId && editingId !== id) commitEdit();
  state.selected = id;
  $$('#slideViewport .el, .stage .el').forEach(n => {
    n.classList.toggle('selected', n.dataset.id === id);
  });
  renderProps();
  positionToolbar();
}

function positionToolbar() {
  const bar = $('#elToolbar');
  const id = state.selected;
  if (!id || editingId === id || $('#present').classList.contains('hidden') === false) {
    bar.classList.add('hidden');
    return;
  }
  const node = document.querySelector(`.stage .el[data-id="${id}"]`);
  if (!node) { bar.classList.add('hidden'); return; }
  const e = findEl(id);
  bar.classList.remove('hidden');
  const r = node.getBoundingClientRect();
  const bw = bar.offsetWidth, bh = bar.offsetHeight;
  let top = r.top - bh - 10;
  if (top < 70) top = r.bottom + 10;
  let left = r.left + r.width / 2 - bw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
  bar.style.top = top + 'px';
  bar.style.left = left + 'px';
  bar.querySelector('.bg-act').style.display = e && e.type === 'image' ? '' : 'none';
}

function startEdit(id) {
  const e = findEl(id);
  if (!e || e.type !== 'text') return;
  const node = document.querySelector(`.stage .el[data-id="${id}"]`);
  if (!node) return;
  editingId = id;
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

  node.addEventListener('blur', commitEdit, { once: true });
  node.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape') { node.blur(); }
  });
  positionToolbar();
}

function commitEdit() {
  if (!editingId) return;
  const id = editingId;
  const node = document.querySelector(`.stage .el[data-id="${id}"]`);
  const e = findEl(id);
  editingId = null;
  if (node) {
    node.removeAttribute('contenteditable');
    node.classList.remove('editing');
    if (e) {
      const raw = node.innerText != null ? node.innerText : node.textContent;
      e.text = String(raw).replace(/\n$/, '');
    }
  }
  if (e) renderThumbs();
  renderProps();
  save();
}

/* ------------------------------------------------------------
   Перетаскивание / ресайз
------------------------------------------------------------ */
function bindNodeEvents(node, handle, e) {
  node.addEventListener('pointerdown', ev => {
    if (editingId === e.id) return;          // идёт редактирование текста
    if (ev.target === handle) return;        // ресайз — отдельно
    ev.stopPropagation();
    if (state.selected !== e.id) select(e.id);

    const startX = ev.clientX, startY = ev.clientY;
    const ox = e.x, oy = e.y;
    let moved = false;
    if (node.setPointerCapture && ev.pointerId != null) {
      try { node.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    const onMove = mv => {
      const dx = (mv.clientX - startX) / scale;
      const dy = (mv.clientY - startY) / scale;
      if (!moved && Math.hypot(dx, dy) < 2) return;
      moved = true;
      const nw = e.type === 'text' ? e.w : e.w;
      e.x = Math.round(Math.max(-(nw - 40), Math.min(SLIDE_W - 40, ox + dx)));
      e.y = Math.round(Math.max(-20, Math.min(SLIDE_H - 30, oy + dy)));
      node.style.left = e.x + 'px';
      node.style.top  = e.y + 'px';
      positionToolbar();
    };
    const onUp = () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      if (moved) { renderThumbs(); save(); }
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
  });

  // двойной клик — редактирование текста
  node.addEventListener('dblclick', ev => {
    ev.stopPropagation();
    const cur = findEl(e.id);
    if (cur && cur.type === 'text') startEdit(cur.id);
  });

  // ресайз
  handle.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    ev.preventDefault();
    if (state.selected !== e.id) select(e.id);
    const cur = findEl(e.id);
    const startX = ev.clientX, startY = ev.clientY;
    const ow = cur.w, oh = cur.h || 0;
    if (handle.setPointerCapture && ev.pointerId != null) {
      try { handle.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    const onMove = mv => {
      const dx = (mv.clientX - startX) / scale;
      if (cur.type === 'text') {
        cur.w = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dx)));
        node.style.width = cur.w + 'px';
      } else if (cur.type === 'image') {
        let nw = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dx)));
        const ar = cur.ar || (ow / oh) || 1;
        cur.w = nw;
        cur.h = Math.round(nw / ar);
        node.style.width  = cur.w + 'px';
        node.style.height = cur.h + 'px';
      } else {
        const dxs = (mv.clientX - startX) / scale;
        const dys = (mv.clientY - startY) / scale;
        cur.w = Math.round(Math.max(60, Math.min(SLIDE_W, ow + dxs)));
        cur.h = Math.round(Math.max(40, Math.min(SLIDE_H, oh + dys)));
        node.style.width  = cur.w + 'px';
        node.style.height = cur.h + 'px';
      }
      positionToolbar();
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      renderThumbs();
      renderProps();
      save();
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  });
}

/* ------------------------------------------------------------
   Действия с элементами
------------------------------------------------------------ */
function addText() {
  const e = {
    id: uid(), type: 'text',
    x: 200, y: 280, w: 520,
    fontSize: 36, weight: 700, italic: false, align: 'left',
    color: state.theme === 'glass' ? '#1c1c1e' : '#eafcff',
    opacity: 1, fontFamily: '', text: 'Новый текст',
  };
  slideOf().elements.push(e);
  renderAll(); select(e.id); save();
  setTimeout(() => startEdit(e.id), 60);
}

function addBlock() {
  const e = {
    id: uid(), type: 'block',
    x: 300, y: 240, w: 420, h: 240,
    radius: 22, fill: state.theme === 'glass' ? 'rgba(255,255,255,.55)' : 'rgba(0,240,255,.10)',
    opacity: 1,
  };
  slideOf().elements.push(e);
  renderAll(); select(e.id); save();
}

function addImageFromSrc(src, ar) {
  const w = 460;
  const h = Math.round(w / (ar || 16 / 9));
  const e = {
    id: uid(), type: 'image',
    x: Math.round(640 - w / 2 + (slideOf().elements.length % 3) * 18),
    y: Math.round(300 - h / 2),
    w, h, radius: 24, opacity: 1,
    src, originalSrc: null, ar,
  };
  slideOf().elements.push(e);
  renderAll(); select(e.id); save();
}

function duplicateEl(id) {
  const src = findEl(id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.x += 28; copy.y += 28;
  slideOf().elements.push(copy);
  renderAll(); select(copy.id); save();
}

function deleteEl(id) {
  const s = slideOf();
  const i = s.elements.findIndex(e => e.id === id);
  if (i < 0) return;
  s.elements.splice(i, 1);
  state.selected = null;
  renderAll(); save();
}

function layerEl(id, dir) {
  const arr = slideOf().elements;
  const i = arr.findIndex(e => e.id === id);
  if (i < 0) return;
  const j = dir === 'up' ? i + 1 : i - 1;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  renderAll(); select(id); save();
}

/* ------------------------------------------------------------
   Слайды
------------------------------------------------------------ */
function addSlide() {
  commitEdit();
  state.slides.push({
    id: uid(), bg: '',
    elements: [
      { id: uid(), type: 'text', x: 60, y: 46, w: 900, fontSize: 56, weight: 900, italic: false, align: 'left',
        color: state.theme === 'glass' ? '#1c1c1e' : '#eafcff', opacity: 1, fontFamily: '', text: 'Заголовок слайда' },
    ],
  });
  state.current = state.slides.length - 1;
  state.selected = null;
  renderAll(); save();
  toast('Слайд добавлен');
}

function duplicateSlide(i) {
  commitEdit();
  const copy = JSON.parse(JSON.stringify(state.slides[i]));
  copy.id = uid();
  copy.elements.forEach(e => e.id = uid());
  state.slides.splice(i + 1, 0, copy);
  state.current = i + 1;
  state.selected = null;
  renderAll(); save();
}

function deleteSlide(i) {
  if (state.slides.length === 1) { toast('Нельзя удалить последний слайд'); return; }
  state.slides.splice(i, 1);
  state.current = Math.min(state.current, state.slides.length - 1);
  if (state.current === i) state.current = Math.max(0, i - 1);
  state.selected = null;
  renderAll(); save();
}

/* ------------------------------------------------------------
   Правая панель свойств
------------------------------------------------------------ */
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
  const e = state.selected ? findEl(state.selected) : null;

  if (!e) { renderBaseProps(panel); return; }

  if (e.type === 'text') renderTextProps(panel, e);
  else if (e.type === 'image') renderImageProps(panel, e);
  else renderBlockProps(panel, e);
}

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
      <div class="prop-group-title">Слайд ${state.current + 1}</div>
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
  panel.querySelector('[data-a="dup-slide"]').onclick = () => duplicateSlide(state.current);
  panel.querySelector('[data-a="del-slide"]').onclick = () => deleteSlide(state.current);
  panel.querySelectorAll('#bgSwatches .swatch').forEach(sw => {
    sw.onclick = () => {
      slideOf().bg = BG_PRESETS[+sw.dataset.i].css;
      renderAll(); save();
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
        <input type="range" id="pSize" min="10" max="120" value="${e.fontSize}">
        <output id="pSizeOut">${e.fontSize}</output>
      </div>
      <div class="prop-row">
        <label>Начертание</label>
        <div class="seg-group" style="flex:1.2">
          <button class="seg-btn ${e.weight >= 700 ? 'active' : ''}" id="pBold"><b>B</b></button>
          <button class="seg-btn ${e.italic ? 'active' : ''}" id="pItalic"><i>I</i></button>
        </div>
      </div>
      <div class="prop-row">
        <label>Шрифт</label>
        <select class="prop-select" id="pFont">
          ${FONTS.map(f => `<option value="${f.v}" ${e.fontFamily === f.v ? 'selected' : ''}>${f.l}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row">
        <label>Выравнивание</label>
        <div class="seg-group" style="flex:1.2">
          <button class="seg-btn ${e.align === 'left' ? 'active' : ''}" data-al="left">⇤</button>
          <button class="seg-btn ${e.align === 'center' ? 'active' : ''}" data-al="center">≡</button>
          <button class="seg-btn ${e.align === 'right' ? 'active' : ''}" data-al="right">⇥</button>
        </div>
      </div>
      <div class="prop-row">
        <label>Цвет</label>
        <input type="color" id="pColor" value=${/^#[0-9a-f]{6}$/i.test(e.color) ? `"${e.color}"` : '"#ffffff"'}>
      </div>
      <div class="swatches" id="pSw">
        ${SWATCHES.map(c => `<div class="swatch" data-c="${c}" style="background:${c}"></div>`).join('')}
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.opacity ?? 1) * 100)}">
      </div>
    </div>

    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const ta = panel.querySelector('#pText');
  ta.value = e.text;
  ta.addEventListener('input', () => {
    e.text = ta.value;
    const node = document.querySelector(`.stage .el[data-id="${e.id}"]`);
    if (node) node.textContent = e.text;
    scheduleThumbSave();
  });

  bindRange(panel, '#pSize', '#pSizeOut', v => {
    e.fontSize = +v;
    applyTextStyle(e);
  });
  bindRange(panel, '#pOpacity', null, v => { e.opacity = v / 100; applyTextStyle(e); });

  panel.querySelector('#pBold').onclick = () => {
    e.weight = e.weight >= 700 ? 400 : 800;
    applyTextStyle(e); renderProps(); save();
  };
  panel.querySelector('#pItalic').onclick = () => {
    e.italic = !e.italic;
    applyTextStyle(e); renderProps(); save();
  };
  panel.querySelector('#pFont').onchange = ev => {
    e.fontFamily = ev.target.value; applyTextStyle(e); save();
  };
  panel.querySelectorAll('[data-al]').forEach(b => {
    b.onclick = () => { e.align = b.dataset.al; applyTextStyle(e); renderProps(); save(); };
  });
  panel.querySelector('#pColor').oninput = ev => { e.color = ev.target.value; applyTextStyle(e); };
  panel.querySelector('#pColor').addEventListener('change', save);
  panel.querySelectorAll('#pSw .swatch').forEach(sw => {
    sw.onclick = () => { e.color = sw.dataset.c; applyTextStyle(e); renderProps(); save(); };
  });
  panel.querySelector('#pDup').onclick = () => duplicateEl(e.id);
  panel.querySelector('#pDel').onclick = () => deleteEl(e.id);
}

function applyTextStyle(e) {
  const node = document.querySelector(`.stage .el[data-id="${e.id}"]`);
  if (node && node) {
    node.style.fontSize = e.fontSize + 'px';
    node.style.color = e.color;
    node.style.fontWeight = e.weight;
    node.style.fontStyle = e.italic ? 'italic' : 'normal';
    node.style.textAlign = e.align;
    node.style.opacity = e.opacity ?? 1;
    node.style.fontFamily = e.fontFamily || '';
    node.style.width = e.w + 'px';
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
      ${e.originalSrc ? `<button class="seg-btn" id="pRestore" style="width:100%">⟲ Вернуть оригинал</button>` : ''}
    </div>

    <div class="prop-group">
      <div class="prop-group-title">Внешний вид</div>
      <div class="prop-row">
        <label>Скругление</label>
        <input type="range" id="pRadius" min="0" max="70" value="${e.radius || 0}">
      </div>
      <div class="prop-row">
        <label>Ширина</label>
        <input type="range" id="pW" min="80" max="900" value="${e.w}">
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.opacity ?? 1) * 100)}">
      </div>
    </div>

    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const nodeOf = () => document.querySelector(`.stage .el[data-id="${e.id}"]`);

  panel.querySelector('#pReplace').onclick = () => pickImage(true, e.id);
  panel.querySelector('#pBg').onclick = () => openBgModal(e.id);
  const rest = panel.querySelector('#pRestore');
  if (rest) rest.onclick = () => {
    e.src = e.originalSrc;
    e.originalSrc = null;
    renderAll(); renderProps(); save();
    toast('Оригинал восстановлен');
  };

  bindRange(panel, '#pRadius', null, v => {
    e.radius = +v; const n = nodeOf(); if (n) n.style.borderRadius = v + 'px';
  });
  bindRange(panel, '#pW', null, v => {
    const nw = +v; const ar = e.ar || (e.w / e.h) || 1;
    e.w = nw; e.h = Math.round(nw / ar);
    const n = nodeOf();
    if (n) { n.style.width = e.w + 'px'; n.style.height = e.h + 'px'; }
    positionToolbar();
  });
  bindRange(panel, '#pOpacity', null, v => {
    e.opacity = v / 100; const n = nodeOf(); if (n) n.style.opacity = e.opacity;
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
        <input type="color" id="pFill" value="${/^#[0-9a-f]{6}$/i.test(e.fill) ? e.fill : '#4facfe'}">
      </div>
      <div class="prop-row">
        <label>Скругление</label>
        <input type="range" id="pRadius" min="0" max="70" value="${e.radius || 22}">
      </div>
      <div class="prop-row">
        <label>Прозрачность</label>
        <input type="range" id="pOpacity" min="10" max="100" value="${Math.round((e.opacity ?? 1) * 100)}">
      </div>
    </div>
    <div class="prop-group">
      <div class="seg-group">
        <button class="seg-btn" id="pDup">⧉ Дублировать</button>
        <button class="seg-btn" id="pDel" style="color:#ff453a">🗑 Удалить</button>
      </div>
    </div>`;

  const nodeOf = () => document.querySelector(`.stage .el[data-id="${e.id}"]`);
  panel.querySelector('#pFill').oninput = ev => {
    e.fill = ev.target.value;
    const n = nodeOf(); if (n) n.style.background = e.fill;
    scheduleThumbSave();
  };
  panel.querySelector('#pFill').addEventListener('change', save);
  bindRange(panel, '#pRadius', null, v => {
    e.radius = +v; const n = nodeOf(); if (n) n.style.borderRadius = v + 'px';
  });
  bindRange(panel, '#pOpacity', null, v => {
    e.opacity = v / 100; const n = nodeOf(); if (n) n.style.opacity = e.opacity;
  });
  panel.querySelector('#pDup').onclick = () => duplicateEl(e.id);
  panel.querySelector('#pDel').onclick = () => deleteEl(e.id);
}

function bindRange(panel, sel, outSel, fn) {
  const inp = panel.querySelector(sel);
  if (!inp) return;
  const out = outSel ? panel.querySelector(outSel) : null;
  inp.addEventListener('input', () => {
    if (out) out.textContent = inp.value;
    fn(inp.value);
  });
  inp.addEventListener('change', save);
}

let thumbTimer = null;
function scheduleThumbSave() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => { renderThumbs(); save(); }, 400);
}

/* ------------------------------------------------------------
   Загрузка изображений
------------------------------------------------------------ */
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

$('#fileImage').addEventListener('change', ev => {
  const file = ev.target.files[0];
  if (!file) return;
  processFile(file, (src, ar) => {
    if (replaceTargetId) {
      const e = findEl(replaceTargetId);
      if (e) {
        if (!e.originalSrc) e.originalSrc = e.src;
        e.src = src; e.ar = ar;
        e.w = 460; e.h = Math.round(460 / ar);
        renderAll(); select(e.id); save();
        toast('Фото заменено');
      }
      replaceTargetId = null;
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

/* ------------------------------------------------------------
   Удаление фона (flood-fill от краёв)
------------------------------------------------------------ */
let bgTargetId = null;
let bgSourceImg = null;

function openBgModal(id) {
  const e = findEl(id);
  if (!e || e.type !== 'image') return;
  bgTargetId = id;
  const img = new Image();
  img.onload = () => {
    bgSourceImg = img;
    $('#bgModal').classList.remove('hidden');
    drawBgPreview();
  };
  img.onerror = () => toast('Изображение недоступно для обработки');
  img.src = e.src;
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
  if (!e.originalSrc) e.originalSrc = e.src;
  e.src = result.toDataURL('image/png');
  $('#bgModal').classList.add('hidden');
  bgTargetId = null; bgSourceImg = null;
  renderAll(); renderProps(); save();
  toast('Фон удалён ✨');
}

let bgRaf = null;
$('#bgTolerance').addEventListener('input', ev => {
  $('#bgToleranceOut').textContent = ev.target.value;
  cancelAnimationFrame(bgRaf);
  bgRaf = requestAnimationFrame(drawBgPreview);
});
$('#bgFeather').addEventListener('change', drawBgPreview);
$('#bgCancel').addEventListener('click', () => {
  $('#bgModal').classList.add('hidden');
  bgTargetId = null; bgSourceImg = null;
});
$('#bgApply').addEventListener('click', applyBgRemoval);
$('#bgModal').addEventListener('click', ev => {
  if (ev.target === $('#bgModal')) $('#bgCancel').click();
});

/* ------------------------------------------------------------
   Панель действий над элементом
------------------------------------------------------------ */
$('#elToolbar').addEventListener('click', ev => {
  const act = ev.target.closest('button')?.dataset.a;
  if (!act || !state.selected) return;
  if (act === 'up')   layerEl(state.selected, 'up');
  if (act === 'down') layerEl(state.selected, 'down');
  if (act === 'dup')  duplicateEl(state.selected);
  if (act === 'del')  deleteEl(state.selected);
  if (act === 'bg')   openBgModal(state.selected);
});

/* ------------------------------------------------------------
   Тема
------------------------------------------------------------ */
// маппинг палитры демо-текста между темами, чтобы текст оставался читаемым
const PALETTE_TO_GLASS = {
  '#eafcff': '#1c1c1e',   // основной текст
  '#9beaff': '#0a84ff',   // подзаголовки / подписи
  '#ffffff': '#1c1c1e',
  '#ffd166': '#bf5af2',
};
const PALETTE_TO_NEON = {
  '#1c1c1e': '#eafcff',
  '#0a84ff': '#9beaff',
  '#bf5af2': '#ffd166',
};

function remapTextColors(t) {
  const map = t === 'glass' ? PALETTE_TO_GLASS : PALETTE_TO_NEON;
  state.slides.forEach(s => s.elements.forEach(e => {
    if (e.type === 'text' && map[e.color]) e.color = map[e.color];
  }));
}

function setTheme(t) {
  commitEdit();
  if (state.theme !== t) remapTextColors(t);
  state.theme = t;
  document.body.dataset.theme = t;
  $$('#themeSwitch button').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  renderStage();
  renderThumbs();
  renderProps();
  positionToolbar();
  save();
}
$('#themeSwitch').addEventListener('click', ev => {
  const t = ev.target.dataset.theme;
  if (t) { setTheme(t); toast(t === 'neon' ? 'Стиль: Неон ⚡' : 'Стиль: Жидкое стекло ◈'); }
});

/* ------------------------------------------------------------
   Презентация
------------------------------------------------------------ */
let pIndex = 0;

function openPresent() {
  commitEdit();
  pIndex = state.current;
  $('#present').classList.remove('hidden');
  renderPresent();
}
function closePresent() {
  $('#present').classList.add('hidden');
  $('#presentStage').innerHTML = '';
}
function renderPresent() {
  const s = state.slides[pIndex];
  const box = $('#presentStage');
  box.innerHTML = '';
  const vp = document.createElement('div');
  vp.className = 'slide-viewport';
  vp.style.position = 'relative';
  if (s.bg) vp.style.background = s.bg;
  vp.appendChild(makeScaler(s, false));
  box.appendChild(vp);
  const sc = Math.min((window.innerWidth * 0.96) / SLIDE_W, (window.innerHeight * 0.92) / SLIDE_H);
  vp.style.width  = Math.round(SLIDE_W * sc) + 'px';
  vp.style.height = Math.round(SLIDE_H * sc) + 'px';
  vp.querySelector('.slide-scaler').style.transform = `scale(${sc})`;
  $('#pCounter').textContent = `${pIndex + 1} / ${state.slides.length}`;
}
function presentStep(d) {
  const n = pIndex + d;
  if (n < 0 || n >= state.slides.length) return;
  pIndex = n;
  renderPresent();
}
$('#btnPresent').addEventListener('click', openPresent);
$('#pClose').addEventListener('click', closePresent);
$('#pNext').addEventListener('click', () => presentStep(1));
$('#pPrev').addEventListener('click', () => presentStep(-1));
$('#present').addEventListener('click', ev => {
  if (ev.target.id === 'present' || ev.target.id === 'presentStage') presentStep(1);
});

/* ------------------------------------------------------------
   Экспорт / импорт / сброс
------------------------------------------------------------ */
$('#btnExport').addEventListener('click', () => {
  commitEdit();
  const data = JSON.stringify({ version: 1, theme: state.theme, slides: state.slides }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rblx-presentation.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Проект экспортирован');
});

$('#btnImport').addEventListener('click', () => { $('#fileImport').value = ''; $('#fileImport').click(); });
$('#fileImport').addEventListener('change', ev => {
  const file = ev.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.slides) || !data.slides.length) throw new Error('bad');
      state.slides = data.slides;
      state.theme = data.theme === 'glass' ? 'glass' : state.theme;
      state.current = 0;
      state.selected = null;
      setTheme(state.theme);
      renderAll(); save();
      toast('Проект загружен');
    } catch (e) { toast('Файл не похож на проект'); }
  };
  r.readAsText(file);
});

$('#btnReset').addEventListener('click', () => {
  if (!confirm('Сбросить всё и вернуть демо-презентацию?')) return;
  localStorage.removeItem(STORE_KEY);
  state.slides = defaultSlides();
  state.current = 0;
  state.selected = null;
  renderAll(); save();
  toast('Сброшено к началу');
});

/* ------------------------------------------------------------
   Клавиатура
------------------------------------------------------------ */
document.addEventListener('keydown', ev => {
  const inField = ev.target.matches('input, textarea, select') ||
                  ev.target.isContentEditable;

  // режим презентации
  if (!$('#present').classList.contains('hidden')) {
    if (ev.key === 'Escape') { closePresent(); ev.preventDefault(); }
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

  // модалка фона
  if (!$('#bgModal').classList.contains('hidden')) {
    if (ev.key === 'Escape') $('#bgCancel').click();
    return;
  }

  if (ev.key === 'Escape') { select(null); return; }

  const id = state.selected;
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
    if (ev.key === 'ArrowLeft')  e.x -= step;
    if (ev.key === 'ArrowRight') e.x += step;
    if (ev.key === 'ArrowUp')    e.y -= step;
    if (ev.key === 'ArrowDown')  e.y += step;
    const node = document.querySelector(`.stage .el[data-id="${id}"]`);
    if (node) { node.style.left = e.x + 'px'; node.style.top = e.y + 'px'; }
    positionToolbar();
    scheduleThumbSave();
  }
});

/* ------------------------------------------------------------
   Общий рендер
------------------------------------------------------------ */
function renderAll() {
  renderStage();
  renderThumbs();
  renderProps();
  positionToolbar();
}

/* ------------------------------------------------------------
   Старт
------------------------------------------------------------ */
window.addEventListener('resize', () => { fitStage(); positionToolbar(); });

load();
document.body.dataset.theme = state.theme;
$$('#themeSwitch button').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
renderAll();
$('#btnAddSlide').addEventListener('click', addSlide);

})();
