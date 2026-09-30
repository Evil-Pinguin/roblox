/* ============================================================
   render.js — ОТРИСОВКА
   Вызывается из setState (renderAll) и при загрузке.
   Сцена/презентация обновляют узлы НА МЕСТЕ, если структура
   слайда не изменилась — это позволяет рисовать прямо во время
   pointerdown/blur, не разрывая жесты и клики.
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const state = App.state;
const SLIDE_W = App.SLIDE_W;
const SLIDE_H = App.SLIDE_H;

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- синхронизация «chrome» (DOM вне сцены) ---------- */
function syncChrome() {
  // тема
  document.body.dataset.theme = state.project.theme;
  $$('#themeSwitch button').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === state.project.theme);
  });
  // презентация
  const p = $('#present');
  if (p) {
    p.classList.toggle('hidden', !state.ui.present);
    p.classList.toggle('edit', state.ui.presentEdit);
  }
  document.body.classList.toggle('present-edit', state.ui.presentEdit);
  const pe = $('#pEdit');
  if (pe) pe.classList.toggle('active', state.ui.presentEdit);
  // модалка фона
  const bm = $('#bgModal');
  if (bm) bm.classList.toggle('hidden', !state.ui.bgModal);
}

/* ---------- текст узла без разрушения ручек (.handle / .handle-rot) ---------- */
function setTextSafe(div, text) {
  if (div.textContent === text) return;      // не трогаем активную правку
  const keeps = [];
  for (const ch of div.children) {
    if (ch.classList && (ch.classList.contains('handle') || ch.classList.contains('handle-rot'))) {
      keeps.push(ch);
    }
  }
  div.textContent = '';
  div.appendChild(document.createTextNode(text));
  for (const k of keeps) div.appendChild(k);
}

/* ---------- применить данные элемента к существующему узлу ---------- */
function applyElStyles(div, e) {
  const editing = div.getAttribute('contenteditable') === 'true';
  div.className = 'el ' + e.type +
    (App.isSelected(e.id) ? ' selected' : '') +
    ((e.props && e.props.locked) ? ' locked' : '') +
    (editing ? ' editing' : '');
  div.style.left = e.x + 'px';
  div.style.top = e.y + 'px';
  div.style.opacity = e.props.opacity != null ? e.props.opacity : 1;
  div.style.zIndex = e.zIndex;
  div.style.transform = e.rotation ? `rotate(${e.rotation}deg)` : '';

  if (e.type === 'text') {
    div.style.width = e.w + 'px';
    div.style.fontSize = e.props.fontSize + 'px';
    div.style.color = e.props.color;
    div.style.fontWeight = e.props.weight;
    div.style.fontStyle = e.props.italic ? 'italic' : 'normal';
    div.style.textAlign = e.props.align;
    div.style.fontFamily = e.props.fontFamily || '';
    setTextSafe(div, e.props.text);
  } else if (e.type === 'image') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.props.radius || 0) + 'px';
    const img = div.querySelector('img');
    if (img && img.getAttribute('src') !== e.props.src) img.src = e.props.src;
  } else if (e.type === 'block') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.props.radius || 22) + 'px';
    div.style.background = e.props.fill || 'rgba(127,127,127,.14)';
  }
}

/* ---------- узел элемента ---------- */
function buildNode(e, interactive) {
  const div = document.createElement('div');
  div.dataset.id = e.id;
  applyElStyles(div, e);

  if (e.type === 'image') {
    const img = document.createElement('img');
    img.alt = '';
    img.addEventListener('load', () => {
      if (!img.naturalWidth) return;
      const cur = App.findEl(e.id);   // свежая ссылка: project мог замениться
      if (cur && !cur.props.ar) {
        App.setState(() => { cur.props.ar = img.naturalWidth / img.naturalHeight; });
      }
    });
    img.src = e.props.src;
    div.appendChild(img);
  }

  if (interactive) {
    // 8 точек ресайза
    for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const h = document.createElement('div');
      h.className = 'handle';
      h.dataset.dir = dir;
      div.appendChild(h);
    }
    // ручка поворота — сверху, на «стебле»
    const rot = document.createElement('div');
    rot.className = 'handle-rot';
    div.appendChild(rot);
    App.editor.bindNodeEvents(div, e);
  }
  return div;
}

function makeScaler(slide, interactive) {
  const sc = document.createElement('div');
  sc.className = 'slide-scaler';
  slide.elements.forEach(e => sc.appendChild(buildNode(e, interactive)));
  return sc;
}

/* Обновить узлы на месте; false — структура изменилась, нужна пересборка */
function refreshNodes(box, slide) {
  const nodes = box.children;
  if (nodes.length !== slide.elements.length) return false;
  for (let i = 0; i < nodes.length; i++) {
    const e = slide.elements[i];
    const n = nodes[i];
    if (n.dataset.id !== String(e.id) || !n.classList.contains(e.type)) return false;
  }
  for (let i = 0; i < nodes.length; i++) applyElStyles(nodes[i], slide.elements[i]);
  return true;
}

function presentOpen() {
  return !!state.ui.present;
}

function activeScale() {
  return presentOpen() ? state.ui.presentScale : state.ui.scale;
}

/* id элемента в той панели, которая сейчас видима */
function elNode(id) {
  if (!id) return null;
  const scope = presentOpen() ? '#presentStage' : '#stage';
  return document.querySelector(`${scope} .el[data-id="${id}"]`);
}

/* ---------- сцена редактора ---------- */
function renderStage() {
  const stage = $('#stage');
  const slide = App.slideOf();
  if (!stage || !slide) return;

  let vp = $('#stageViewport');
  let sc = vp && vp.firstElementChild;
  const reusable = vp &&
    vp.dataset.slideId === String(slide.id) &&
    sc && sc.classList.contains('slide-scaler') &&
    refreshNodes(sc, slide);

  if (!reusable) {
    stage.innerHTML = '';
    vp = document.createElement('div');
    vp.className = 'slide-frame slide-viewport';
    vp.id = 'stageViewport';
    vp.dataset.slideId = slide.id;
    sc = makeScaler(slide, true);
    vp.appendChild(sc);
    vp.addEventListener('pointerdown', ev => {
      if (ev.target === vp || ev.target.classList.contains('slide-scaler')) {
        App.editor.startMarquee(ev);   // рамка выделения; клик без движения — снять
      }
    });
    stage.appendChild(vp);
  }
  vp.style.background = slide.bg || '';
  fitStage();

  // синхронизация реальной высоты текста в модель (h в схеме v2)
  slide.elements.forEach(e => {
    if (e.type !== 'text') return;
    const node = vp.querySelector('.el[data-id="' + e.id + '"]');
    if (node && node.offsetHeight > 0) e.h = node.offsetHeight;
  });
}

function fitStage() {
  const vp = $('#stageViewport');
  if (!vp) return;
  const area = $('#stageArea');
  const availW = area.clientWidth - 56;
  const availH = area.clientHeight - 76;
  let scale = Math.min(availW / SLIDE_W, availH / SLIDE_H, 1.15);
  // крошечное/непоказанное окно → scale ≤ 0: drag и layout ломались
  if (!Number.isFinite(scale) || scale < 0.05) scale = 0.05;
  state.ui.scale = scale;
  const w = Math.round(SLIDE_W * scale);
  const h = Math.round(SLIDE_H * scale);
  vp.style.width = w + 'px';
  vp.style.height = h + 'px';
  const sc = vp.querySelector('.slide-scaler');
  if (sc) sc.style.transform = `scale(${scale})`;
}

/* ---------- миниатюры слайдов ---------- */
function renderThumbs() {
  const list = $('#slidesList');
  if (!list) return;
  list.innerHTML = '';
  state.project.slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slide-item';

    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (i === state.ui.current ? ' active' : '');
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
      if (a === 'dup') App.editor.duplicateSlide(i);
      if (a === 'del') App.editor.deleteSlide(i);
    });
    item.appendChild(acts);

    thumb.addEventListener('click', () => App.editor.gotoSlide(i));

    item.insertBefore(thumb, acts);
    list.appendChild(item);

    const k = thumb.clientWidth / SLIDE_W;
    inner.style.transform = `scale(${k})`;
  });
}

/* ---------- презентация ---------- */
function renderPresent() {
  const s = App.slideOf();
  const box = $('#presentStage');
  if (!box || !s) return;
  const inter = String(state.ui.presentEdit);

  let vp = box.firstElementChild;
  let sc = vp && vp.firstElementChild;
  const reusable = vp &&
    vp.classList.contains('slide-viewport') &&
    vp.dataset.slideId === String(s.id) &&
    vp.dataset.interactive === inter &&
    sc && sc.classList.contains('slide-scaler') &&
    refreshNodes(sc, s);

  if (!reusable) {
    box.innerHTML = '';
    vp = document.createElement('div');
    vp.className = 'slide-viewport';
    vp.style.position = 'relative';
    vp.dataset.slideId = s.id;
    vp.dataset.interactive = inter;
    sc = makeScaler(s, state.ui.presentEdit); // интерактив — только в режиме правки
    vp.appendChild(sc);
    box.appendChild(vp);
  }
  vp.style.background = s.bg || '';

  // в режиме правки слайд вписывается между панелями конструктора
  let padL = 0, padR = 0;
  if (state.ui.presentEdit) {
    const lp = document.querySelector('.side-panel.left');
    const rp = document.querySelector('.side-panel.right');
    padL = lp && getComputedStyle(lp).display !== 'none' ? lp.offsetWidth : 0;
    padR = rp && getComputedStyle(rp).display !== 'none' ? rp.offsetWidth : 0;
  }
  const availW = window.innerWidth - padL - padR;
  let k = Math.min((availW * 0.94) / SLIDE_W, (window.innerHeight * 0.88) / SLIDE_H);
  if (!Number.isFinite(k) || k < 0.05) k = 0.05;   // защита от вырожденного окна
  state.ui.presentScale = k;
  vp.style.width = Math.round(SLIDE_W * k) + 'px';
  vp.style.height = Math.round(SLIDE_H * k) + 'px';
  sc.style.transform = `scale(${k})`;
  // центрируем в зоне между панелями
  box.style.transform = `translateX(${Math.round((padL - padR) / 2)}px)`;
  $('#pCounter').textContent = `${state.ui.current + 1} / ${state.project.slides.length}`;
  positionToolbar();
}

/* ---------- тулбар элемента ---------- */
function positionToolbar() {
  const bar = $('#elToolbar');
  if (!bar) return;
  const id = state.ui.selected;
  // в презентации панель видна только в режиме редактирования
  if (!id || state.ui.editingId === id || (presentOpen() && !state.ui.presentEdit)) {
    bar.classList.add('hidden');
    return;
  }
  const node = elNode(id);
  if (!node) { bar.classList.add('hidden'); return; }
  const e = App.findEl(id);
  bar.classList.remove('hidden');
  const r = node.getBoundingClientRect();
  const bw = bar.offsetWidth, bh = bar.offsetHeight;
  let top = r.top - bh - 10;
  if (top < 70) top = r.bottom + 10;
  let left = r.left + r.width / 2 - bw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
  bar.style.top = top + 'px';
  bar.style.left = left + 'px';
  const bgAct = bar.querySelector('.bg-act');
  if (bgAct) bgAct.style.display = e && e.type === 'image' ? '' : 'none';
}

/* ---------- тост ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- ПОЛНАЯ перерисовка (вызывается только из setState) ---------- */
function renderAll() {
  syncChrome();
  renderStage();
  if (presentOpen()) {
    renderPresent();
  } else {
    const ps = $('#presentStage');
    if (ps && ps.innerHTML) ps.innerHTML = '';
  }
  renderThumbs();
  App.editor.renderProps();
  positionToolbar();   // тулбар всегда согласован с выделением/правкой
  positionToolbar();
}

App.render = {
  $, $$, buildNode, makeScaler, refreshNodes, syncChrome, setTextSafe,
  renderStage, fitStage, renderThumbs, renderPresent,
  positionToolbar, elNode, activeScale, presentOpen,
  toast, renderAll,
};

})(window.App);
