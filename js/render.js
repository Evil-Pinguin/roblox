/* ============================================================
   render.js — ОТРИСОВКА
   buildNode, сцена, миниатюры, презентация, тулбар, тосты
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const state = App.state;
const SLIDE_W = App.SLIDE_W;
const SLIDE_H = App.SLIDE_H;

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- узел элемента ---------- */
function buildNode(e, interactive) {
  const div = document.createElement('div');
  div.className = 'el ' + e.type + (state.ui.selected === e.id ? ' selected' : '');
  div.dataset.id = e.id;
  div.style.left = e.x + 'px';
  div.style.top = e.y + 'px';
  div.style.opacity = e.props.opacity != null ? e.props.opacity : 1;
  div.style.zIndex = e.zIndex;
  if (e.rotation) div.style.transform = `rotate(${e.rotation}deg)`;

  if (e.type === 'text') {
    div.style.width = e.w + 'px';
    div.style.fontSize = e.props.fontSize + 'px';
    div.style.color = e.props.color;
    div.style.fontWeight = e.props.weight;
    div.style.fontStyle = e.props.italic ? 'italic' : 'normal';
    div.style.textAlign = e.props.align;
    if (e.props.fontFamily) div.style.fontFamily = e.props.fontFamily;
    div.textContent = e.props.text;
  } else if (e.type === 'image') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.props.radius || 0) + 'px';
    const img = document.createElement('img');
    img.alt = '';
    img.addEventListener('load', () => {
      if (!e.props.ar && img.naturalWidth) e.props.ar = img.naturalWidth / img.naturalHeight;
    });
    img.src = e.props.src;
    div.appendChild(img);
  } else if (e.type === 'block') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = (e.props.radius || 22) + 'px';
    div.style.background = e.props.fill || 'rgba(127,127,127,.14)';
  }

  if (interactive) {
    const h = document.createElement('div');
    h.className = 'handle';
    div.appendChild(h);
    App.editor.bindNodeEvents(div, h, e);
  }
  return div;
}

function makeScaler(slide, interactive) {
  const sc = document.createElement('div');
  sc.className = 'slide-scaler';
  slide.elements.forEach(e => sc.appendChild(buildNode(e, interactive)));
  return sc;
}

function presentOpen() {
  const p = $('#present');
  return !!p && !p.classList.contains('hidden');
}

function activeScale() {
  return presentOpen() ? state.ui.presentScale : state.ui.scale;
}

/* id элемента в той панели, которая сейчас видима: презентация или редактор */
function elNode(id) {
  if (!id) return null;
  const scope = presentOpen() ? '#presentStage' : '#stage';
  return document.querySelector(`${scope} .el[data-id="${id}"]`);
}

/* ---------- сцена редактора ---------- */
function renderStage() {
  const stage = $('#stage');
  stage.innerHTML = '';
  const vp = document.createElement('div');
  vp.className = 'slide-frame slide-viewport';
  vp.id = 'stageViewport';
  const slide = App.slideOf();
  if (slide.bg) vp.style.background = slide.bg;
  vp.appendChild(makeScaler(slide, true));

  vp.addEventListener('pointerdown', ev => {
    if (ev.target === vp || ev.target.classList.contains('slide-scaler')) {
      App.editor.select(null);
      App.editor.commitEdit();
    }
  });
  stage.appendChild(vp);
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
  const scale = Math.min(availW / SLIDE_W, availH / SLIDE_H, 1.15);
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
  box.innerHTML = '';
  const vp = document.createElement('div');
  vp.className = 'slide-viewport';
  vp.style.position = 'relative';
  if (s.bg) vp.style.background = s.bg;
  vp.appendChild(makeScaler(s, state.ui.presentEdit)); // интерактив — только в режиме правки
  box.appendChild(vp);

  // в режиме правки слайд вписывается между панелями конструктора
  let padL = 0, padR = 0;
  if (state.ui.presentEdit) {
    const lp = document.querySelector('.side-panel.left');
    const rp = document.querySelector('.side-panel.right');
    padL = lp && getComputedStyle(lp).display !== 'none' ? lp.offsetWidth : 0;
    padR = rp && getComputedStyle(rp).display !== 'none' ? rp.offsetWidth : 0;
  }
  const availW = window.innerWidth - padL - padR;
  const sc = Math.min((availW * 0.94) / SLIDE_W, (window.innerHeight * 0.88) / SLIDE_H);
  state.ui.presentScale = sc;
  vp.style.width = Math.round(SLIDE_W * sc) + 'px';
  vp.style.height = Math.round(SLIDE_H * sc) + 'px';
  vp.querySelector('.slide-scaler').style.transform = `scale(${sc})`;
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

/* ---------- перерисовка всего ---------- */
function renderAll() {
  renderStage();
  if (presentOpen()) renderPresent();
  renderThumbs();
  App.editor.renderProps();
  positionToolbar();
}

App.render = {
  $, $$, buildNode, makeScaler, renderStage, fitStage, renderThumbs,
  renderPresent, positionToolbar, elNode, activeScale, presentOpen,
  toast, renderAll,
};

})(window.App);
