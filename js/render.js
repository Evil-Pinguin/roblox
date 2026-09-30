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
const SW = () => App.slideW();
const SH = () => App.slideH();

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
/* ---------- Библиотека иконок (20×24 viewBox) и стикеров ----------
   $C в фрагменте подставляется цветом иконки. */
const ICONS = {
  star: '<polygon points="12,2.5 14.9,8.9 21.9,9.6 16.7,14.4 18.2,21.4 12,17.9 5.8,21.4 7.3,14.4 2.1,9.6 9.1,8.9" fill="$C"/>',
  heart: '<path d="M12 21C7 16.6 3 13.2 3 9 3 6.2 5.2 4 8 4c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5 0 4.2-4 7.6-9 12Z" fill="$C"/>',
  check: '<polyline points="4,12.5 9.5,18 20,6.5" fill="none" stroke="$C" stroke-width="2.2"/>',
  close: '<path d="M5 5 19 19 M19 5 5 19" fill="none" stroke="$C" stroke-width="2.2" stroke-linecap="round"/>',
  home: '<path d="M12 3 3 11h2.5v10h5v-6h3v6h5V11H21z" fill="$C"/>',
  play: '<polygon points="7,4 20,12 7,20" fill="$C"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="$C"/>',
  camera: '<path d="M9 4.5h6l1.3 2.2H20A2 2 0 0 1 22 8.7V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.7a2 2 0 0 1 2-2h3.7L9 4.5Z" fill="none" stroke="$C" stroke-width="1.8"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="$C" stroke-width="1.8"/>',
  user: '<circle cx="12" cy="8" r="4" fill="$C"/><path d="M4.5 21c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" fill="none" stroke="$C" stroke-width="1.9" stroke-linecap="round"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.8 2H4.2l1.8-2Z" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 21.5a2.4 2.4 0 0 0 4 0" fill="none" stroke="$C" stroke-width="1.8"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2" fill="$C"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="$C" stroke-width="1.9"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13.5h9L17.5 7" fill="none" stroke="$C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  pencil: '<path d="M4 20.2l1.2-4.4L16.8 4.2a2.1 2.1 0 0 1 3 3L8.4 19.2 4 20.2Z" fill="$C"/>',
  search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="$C" stroke-width="1.9"/><path d="M15.2 15.2 21 21" stroke="$C" stroke-width="1.9" stroke-linecap="round"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2" fill="none" stroke="$C" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="$C" stroke-width="1.8" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="$C" stroke-width="1.8"/><path d="M12 7v5.5l3.5 2" fill="none" stroke="$C" stroke-width="1.8" stroke-linecap="round"/>',
  flag: '<path d="M6 21.5V3.5m0 0h11.5L15 8l2.5 4.5H6" fill="none" stroke="$C" stroke-width="1.9" stroke-linejoin="round"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="$C" stroke-width="1.8"/><path d="M4 7.5 12 13.5 20 7.5" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/>',
  chat: '<path d="M4 5.5h16v11H9.5L4.5 20.5v-15Z" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4.2" fill="$C"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="$C" stroke-width="1.8" stroke-linecap="round"/>',
  moon: '<path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7Z" fill="$C"/>',
  cloud: '<path d="M7.2 18.5a4.6 4.6 0 1 1 .9-9.1 5.6 5.6 0 0 1 10.6 1.6 3.5 3.5 0 0 1-.6 7.5H7.2Z" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/>',
  bolt: '<polygon points="13,2 4.5,13.5 11,13.5 10,22 19.5,10 13,10" fill="$C"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1" fill="none" stroke="$C" stroke-width="1.8"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S9.5 8 8.5 7a2 2 0 1 1 3.5-2c1 1 0 3 0 3Zm0 0s2.5 0 3.5-1a2 2 0 1 0-3.5-2c-1 1 0 3 0 3Z" fill="none" stroke="$C" stroke-width="1.7" stroke-linejoin="round"/>',
  music: '<circle cx="7" cy="17.5" r="3" fill="none" stroke="$C" stroke-width="1.8"/><circle cx="18" cy="15.5" r="3" fill="none" stroke="$C" stroke-width="1.8"/><path d="M10 17.5V6.5l11-2.5V14" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/>',
  pin: '<path d="M12 21.5S19 14.4 19 9.5a7 7 0 1 0-14 0c0 4.9 7 12 7 12Z" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.6" fill="$C"/>',
  info: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="$C" stroke-width="1.8"/><path d="M12 11v6" stroke="$C" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.2" fill="$C"/>',
  warning: '<path d="M12 3.5 22 20.5H2L12 3.5Z" fill="none" stroke="$C" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.5" stroke="$C" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.2" fill="$C"/>',
};

const STICKERS = ['😀', '😂', '😍', '😎', '🥳', '🤔', '😅', '👍', '👏', '🙏', '🔥', '✨',
                  '💯', '🎉', '❤️', '⭐', '🚀', '🎮', '💻', '🎯', '⚡', '🛡️', '🏆', '📌'];

function iconSvg(name, color) {
  const frag = ICONS[name] || ICONS.star;
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block" aria-hidden="true">` +
    frag.replace(/\$C/g, color || '#eafcff') + `</svg>`;
}

/* фильтры изображения одной строкой (дефолты → none) */
function imageFilter(P) {
  const b = P.brightness != null && P.brightness !== 100 ? `brightness(${P.brightness}%) ` : '';
  const c = P.contrast != null && P.contrast !== 100 ? `contrast(${P.contrast}%) ` : '';
  const bl = P.blur ? `blur(${P.blur}px)` : '';
  return (b + c + bl).trim() || 'none';
}

/* позиция img под кадр props.crop ({x,y,w,h} в % исходника) */
function applyCropToImg(img, crop) {
  const c = crop && !(crop.x === 0 && crop.y === 0 && crop.w === 100 && crop.h === 100) ? crop : null;
  if (!c) {
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.left = '0';
    img.style.top = '0';
    return;
  }
  const kx = 100 / c.w, ky = 100 / c.h;
  img.style.width = (kx * 100) + '%';
  img.style.height = (ky * 100) + '%';
  img.style.left = (-c.x * kx) + '%';
  img.style.top = (-c.y * ky) + '%';
}

/* SVG-содержимое фигуры: координаты в %/px — живой ресайз не ломает,
   viewBox включается только у звезды (ей нужна polygon-геометрия 0–100). */
function applyShapeSvg(div, e) {
  const P = e.props;
  let svg = div.querySelector(':scope > svg.shape-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'shape-svg');
    div.insertBefore(svg, div.firstChild);
  }
  const kind = P.shape || 'rect';
  const fill = P.fill || '#4facfe';
  const sw = +P.strokeWidth || 0;
  const strokeAttr = sw > 0 ? ` stroke="${P.stroke || '#000000'}" stroke-width="${sw}"` : '';

  if (kind === 'star') {
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `<polygon points="50,2 61.8,37.3 98.9,37.3 68.9,59.1 80.9,94.1 50,72 19.1,94.1 31.1,59.1 1.1,37.3 38.2,37.3" fill="${fill}"` +
      (sw > 0 ? ` stroke="${P.stroke || '#000000'}" stroke-width="${sw}" stroke-linejoin="round" vector-effect="non-scaling-stroke"` : '') + `/>`;
    return;
  }

  svg.removeAttribute('viewBox');
  svg.removeAttribute('preserveAspectRatio');
  if (kind === 'oval') {
    svg.innerHTML = `<ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="${fill}"${strokeAttr}/>`;
  } else if (kind === 'line') {
    svg.innerHTML = `<line x1="1%" y1="50%" x2="99%" y2="50%" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>`;
  } else if (kind === 'arrow') {
    svg.innerHTML =
      `<line x1="1%" y1="50%" x2="78%" y2="50%" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="76%" y1="26%" x2="99%" y2="50%" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="76%" y1="74%" x2="99%" y2="50%" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>`;
  } else {
    const r = Math.max(0, +P.radius || 0);
    svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" rx="${r}" ry="${r}" fill="${fill}"${strokeAttr}/>`;
  }
}

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
    const P = e.props;
    div.style.width = e.w + 'px';
    div.style.fontSize = P.fontSize + 'px';
    div.style.fontWeight = P.weight;
    div.style.fontStyle = P.italic ? 'italic' : 'normal';
    div.style.textDecoration = P.underline ? 'underline' : 'none';
    div.style.textAlign = P.align;
    div.style.lineHeight = String(P.lineHeight != null ? P.lineHeight : 1.3);
    div.style.letterSpacing = (P.letterSpacing != null ? P.letterSpacing : 0) + 'px';
    div.style.fontFamily = P.fontFamily || '';
    div.style.textShadow = P.shadowOn
      ? `${P.shadowX || 0}px ${P.shadowY || 0}px ${P.shadowBlur || 0}px ${P.shadowColor || '#000000'}`
      : 'none';
    div.style.setProperty('-webkit-text-stroke',
      P.strokeWidth > 0 ? `${P.strokeWidth}px ${P.strokeColor || '#000000'}` : 'none');
    if (P.gradOn) {
      div.style.backgroundImage =
        `linear-gradient(${P.gradAngle != null ? P.gradAngle : 90}deg, ${P.gradColor1 || '#ffffff'}, ${P.gradColor2 || '#000000'})`;
      div.style.setProperty('-webkit-background-clip', 'text');
      div.style.setProperty('background-clip', 'text');
      div.style.color = 'transparent';
    } else {
      div.style.backgroundImage = 'none';
      div.style.color = P.color;
    }
    setTextSafe(div, P.text);
  } else if (e.type === 'image') {
    const P = e.props;
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    div.style.borderRadius = P.maskShape === 'circle' ? '50%' : (P.radius || 0) + 'px';
    div.style.boxShadow = P.shadow > 0
      ? `0 10px ${P.shadow}px rgba(0,0,0,${Math.min(0.6, 0.18 + P.shadow / 150).toFixed(2)})`
      : 'none';
    const img = div.querySelector('img');
    if (img) {
      if (img.getAttribute('src') !== P.src) img.src = P.src;
      applyCropToImg(img, P.crop);
      img.style.filter = imageFilter(P);
    }
  } else if (e.type === 'shape') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    applyShapeSvg(div, e);
  } else if (e.type === 'icon') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    let svg = div.querySelector(':scope > svg.icon-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon-svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      div.insertBefore(svg, div.firstChild);
    }
    svg.innerHTML = (ICONS[e.props.icon] || ICONS.star).replace(/\$C/g, e.props.fill || '#eafcff');
  } else if (e.type === 'sticker') {
    div.style.width = e.w + 'px';
    div.style.height = e.h + 'px';
    const fs = Math.round(Math.min(e.w, e.h) * 0.85);
    div.style.fontSize = fs + 'px';
    div.style.lineHeight = e.h + 'px';
    div.style.textAlign = 'center';
    setTextSafe(div, e.props.emoji || '😀');
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
/* единый фон слайда: картинка (обложка) поверх цвета/градиента (п.27) */
function slideBgCss(s) {
  if (!s) return '';
  const grad = s.bg || '';
  if (s.bgImage) return `url("${s.bgImage}") center / cover no-repeat${grad ? ', ' + grad : ''}`;
  return grad;
}

/* применяем фон: цвет → backgroundColor, всё image-ное → backgroundImage
   (надёжнее shorthand — один битый аргумент не обнуляет всё) */
function applySlideBg(el, s) {
  if (!el) return;
  const grad = (s && s.bg) || '';
  const isColor = /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\()/.test(grad);
  if (s && s.bgImage) {
    el.style.backgroundImage = `url("${s.bgImage}")${grad && !isColor ? ', ' + grad : ''}`;
    el.style.backgroundColor = isColor ? grad : '';
  } else {
    el.style.backgroundImage = isColor ? '' : grad;
    el.style.backgroundColor = isColor ? grad : '';
  }
}

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
  applySlideBg(vp, slide);
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
  const availW = area.clientWidth - 32;
  const availH = area.clientHeight - 56;
  // без потолка 1.15: сцена занимает всю свободную зону на любых мониторах
  let fit = Math.min(availW / SW(), availH / SH());
  // крошечное/непоказанное окно → scale ≤ 0: drag и layout ломались
  if (!Number.isFinite(fit) || fit < 0.05) fit = 0.05;
  let scale = fit * (state.ui.zoom || 1);
  if (!Number.isFinite(scale) || scale < 0.02) scale = 0.02;
  state.ui.scale = scale;
  const zv = $('#zoomVal');
  if (zv) zv.textContent = Math.round((state.ui.zoom || 1) * 100) + '%';
  const w = Math.round(SW() * scale);
  const h = Math.round(SH() * scale);
  vp.style.width = w + 'px';
  vp.style.height = h + 'px';
  const sc = vp.querySelector('.slide-scaler');
  if (sc) sc.style.transform = `scale(${scale})`;
}

/* ---------- drag&drop порядка слайдов (п.26) ---------- */
let dnd = null;            // { from, startY, moved, boundary }
let dndSuppressClick = false;
let dndBound = false;

/* граница вставки 0..n по clientY: верхняя половина item → граница до него, нижняя → после */
function dndBoundaryAt(clientY, list) {
  const items = Array.from(list.querySelectorAll('.slide-item'));
  if (!items.length) return null;
  const lr = list.getBoundingClientRect();
  const h0 = items[0].getBoundingClientRect().height;
  if (!(h0 > 0)) return null;
  const rel = clientY - lr.top;
  if (rel < 0) return 0;
  const i = Math.floor(rel / h0);
  if (i >= items.length) return items.length;
  const r = items[i].getBoundingClientRect();
  return clientY < r.top + r.height / 2 ? i : i + 1;
}

function dndPaint(list, boundary) {
  const items = list.querySelectorAll('.slide-item');
  items.forEach(el => el.classList.remove('drop-before', 'drop-after'));
  if (boundary == null || !items.length) return;
  if (boundary >= items.length) items[items.length - 1].classList.add('drop-after');
  else items[boundary].classList.add('drop-before');
}

function bindSlideDnd() {
  const list = $('#slidesList');
  if (!list || dndBound) return;
  dndBound = true;
  list.addEventListener('pointerdown', ev => {
    if (ev.button != null && ev.button !== 0) return;
    if (ev.target.closest('.slide-item-actions')) return;
    const item = ev.target.closest('.slide-item');
    if (!item) return;
    const from = +item.dataset.i;
    if (!Number.isInteger(from) || from < 0) return;
    dnd = { from, startY: ev.clientY, moved: false, boundary: null };
    dndSuppressClick = false;
    ev.preventDefault();

    const onMove = e => {
      if (!dnd) return;
      if (!dnd.moved) {
        if (Math.abs(e.clientY - dnd.startY) < 4) return;
        dnd.moved = true;
        item.classList.add('dragging');
      }
      const b = dndBoundaryAt(e.clientY, list);
      if (b == null) return;
      dnd.boundary = b;
      dndPaint(list, b);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!dnd) return;
      const { from, moved, boundary } = dnd;
      dnd = null;
      item.classList.remove('dragging');
      dndPaint(list, null);
      if (moved) {
        dndSuppressClick = true;
        if (boundary != null) {
          const pos = boundary > from ? boundary - 1 : boundary;
          if (pos !== from && App.editor.moveSlide) App.editor.moveSlide(from, pos);
        }
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

/* ---------- миниатюры слайдов ---------- */
function renderThumbs() {
  const list = $('#slidesList');
  if (!list) return;
  list.innerHTML = '';
  state.project.slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slide-item';
    item.dataset.i = i;

    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (i === state.ui.current ? ' active' : '');
    applySlideBg(thumb, s);

    const inner = document.createElement('div');
    inner.className = 'thumb-inner';
    inner.style.width = SW() + 'px';
    inner.style.height = SH() + 'px';
    thumb.style.aspectRatio = `${SW()} / ${SH()}`;
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

    thumb.addEventListener('click', () => {
      if (dndSuppressClick) { dndSuppressClick = false; return; }
      App.editor.gotoSlide(i);
    });

    item.insertBefore(thumb, acts);
    list.appendChild(item);

    const k = thumb.clientWidth / SW();
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
  applySlideBg(vp, s);

  // в режиме правки слайд вписывается между панелями конструктора
  let padL = 0, padR = 0;
  if (state.ui.presentEdit) {
    const lp = document.querySelector('.side-panel.left');
    const rp = document.querySelector('.side-panel.right');
    padL = lp && getComputedStyle(lp).display !== 'none' ? lp.offsetWidth : 0;
    padR = rp && getComputedStyle(rp).display !== 'none' ? rp.offsetWidth : 0;
  }
  const availW = window.innerWidth - padL - padR;
  let k = Math.min((availW * 0.94) / SW(), (window.innerHeight * 0.88) / SH());
  if (!Number.isFinite(k) || k < 0.05) k = 0.05;   // защита от вырожденного окна
  state.ui.presentScale = k;
  vp.style.width = Math.round(SW() * k) + 'px';
  vp.style.height = Math.round(SH() * k) + 'px';
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
  $, $$, buildNode, makeScaler, refreshNodes, syncChrome, setTextSafe, applyElStyles,
  ICONS, STICKERS, iconSvg, imageFilter, applyCropToImg,
  renderStage, fitStage, renderThumbs, renderPresent, slideBgCss, bindSlideDnd,
  positionToolbar, elNode, activeScale, presentOpen,
  toast, renderAll,
};

})(window.App);
