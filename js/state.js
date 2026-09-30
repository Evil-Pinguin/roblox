/* ============================================================
   state.js — ДАННЫЕ ПРОЕКТА
   Единая схема v2:  project → slides[] → elements[]
   Элемент: { id, type, x, y, w, h, rotation, zIndex, props }
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const SLIDE_W = 1280;
const SLIDE_H = 720;

/* пресеты размеров слайда (п.28) */
const SIZES = {
  '16:9': [1280, 720],
  '4:3': [1280, 960],
  '1:1': [1000, 1000],
  '9:16': [720, 1280],
};
function slideW() { return (state.project && state.project.width) || SLIDE_W; }
function slideH() { return (state.project && state.project.height) || SLIDE_H; }

let uidN = 1;
const uid = () => 'u' + (uidN++) + Date.now().toString(36).slice(-4);

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

/* ---------- дефолтные props по типам ---------- */
function defaultProps(type) {
  if (type === 'image') return { src: '', originalSrc: null, radius: 24, opacity: 1, ar: 16 / 9,
    brightness: 100, contrast: 100, blur: 0, shadow: 0, maskShape: 'rect', crop: null, origAr: null };
  if (type === 'icon') return { icon: 'star', fill: '#eafcff', opacity: 1 };
  if (type === 'sticker') return { emoji: '😀', opacity: 1 };
  if (type === 'block') return { fill: 'rgba(127,127,127,.14)', radius: 22, opacity: 1 };
  if (type === 'shape') return { shape: 'rect', fill: '#4facfe', stroke: '#000000', strokeWidth: 0, radius: 0, opacity: 1 };
  return { text: '', fontSize: 36, color: '#eafcff', weight: 700, italic: false,
           underline: false, align: 'left', fontFamily: '', opacity: 1,
           lineHeight: 1.3, letterSpacing: 0,
           strokeWidth: 0, strokeColor: '#000000',
           shadowOn: false, shadowColor: '#000000', shadowBlur: 10, shadowX: 0, shadowY: 3,
           gradOn: false, gradColor1: '#00f2fe', gradColor2: '#ff4fa3', gradAngle: 90 };
}

/* ---------- фабрики элементов (схема v2) ---------- */
function makeText(o = {}) {
  return {
    id: o.id || uid(), type: 'text',
    x: num(o.x, 60), y: num(o.y, 60), w: num(o.w, 520), h: num(o.h, 60),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('text'),
      text: o.text != null ? o.text : 'Новый текст',
      fontSize: num(o.fontSize, 36),
      color: o.color || '#eafcff',
      weight: num(o.weight, 700),
      italic: !!o.italic,
      underline: !!o.underline,
      lineHeight: num(o.lineHeight, 1.3),
      letterSpacing: num(o.letterSpacing, 0),
      strokeWidth: num(o.strokeWidth, 0), strokeColor: o.strokeColor || '#000000',
      shadowOn: !!o.shadowOn, shadowColor: o.shadowColor || '#000000',
      shadowBlur: num(o.shadowBlur, 10), shadowX: num(o.shadowX, 0), shadowY: num(o.shadowY, 3),
      gradOn: !!o.gradOn, gradColor1: o.gradColor1 || '#00f2fe',
      gradColor2: o.gradColor2 || '#ff4fa3', gradAngle: num(o.gradAngle, 90),
      align: o.align || 'left',
      fontFamily: o.fontFamily || '',
      opacity: num(o.opacity, 1),
    },
  };
}

function makeImage(o = {}) {
  return {
    id: o.id || uid(), type: 'image',
    x: num(o.x, 300), y: num(o.y, 180), w: num(o.w, 460), h: num(o.h, 260),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('image'),
      src: o.src || '',
      originalSrc: o.originalSrc ?? null,
      radius: num(o.radius, 24),
      opacity: num(o.opacity, 1),
      ar: num(o.ar, num(o.w, 460) / (num(o.h, 260) || 1)),
    },
  };
}

function makeBlock(o = {}) {
  return {
    id: o.id || uid(), type: 'block',
    x: num(o.x, 300), y: num(o.y, 240), w: num(o.w, 420), h: num(o.h, 240),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('block'),
      fill: o.fill || 'rgba(127,127,127,.14)',
      radius: num(o.radius, 22),
      opacity: num(o.opacity, 1),
    },
  };
}

function makeShape(o = {}) {
  return {
    id: o.id || uid(), type: 'shape',
    x: num(o.x, 300), y: num(o.y, 240), w: num(o.w, 300), h: num(o.h, 200),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('shape'),
      shape: ['rect', 'oval', 'line', 'arrow', 'star'].includes(o.shape) ? o.shape : 'rect',
      fill: o.fill || '#4facfe',
      stroke: o.stroke || '#000000',
      strokeWidth: num(o.strokeWidth, 0),
      radius: num(o.radius, 0),
      opacity: num(o.opacity, 1),
    },
  };
}

function makeIcon(o = {}) {
  return {
    id: o.id || uid(), type: 'icon',
    x: num(o.x, 540), y: num(o.y, 260), w: num(o.w, 120), h: num(o.h, 120),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('icon'),
      icon: o.icon || 'star',
      fill: o.fill || '#eafcff',
      opacity: num(o.opacity, 1),
    },
  };
}

function makeSticker(o = {}) {
  return {
    id: o.id || uid(), type: 'sticker',
    x: num(o.x, 560), y: num(o.y, 260), w: num(o.w, 140), h: num(o.h, 140),
    rotation: num(o.rotation, 0), zIndex: num(o.zIndex, 0),
    props: {
      ...defaultProps('sticker'),
      emoji: o.emoji || '😀',
      opacity: num(o.opacity, 1),
    },
  };
}

function makeElement(type, o = {}) {
  if (type === 'image') return makeImage(o);
  if (type === 'block') return makeBlock(o);
  if (type === 'shape') return makeShape(o);
  if (type === 'icon') return makeIcon(o);
  if (type === 'sticker') return makeSticker(o);
  return makeText(o);
}

function makeSlide(elements = [], bg = '') {
  const slide = { id: uid(), bg, bgImage: '', elements };
  normalizeZ(slide);
  return slide;
}

/* ---------- демо-проект ---------- */
function defaultProject() {
  const s1 = makeSlide([
    makeText({ x: 60, y: 46, w: 720, h: 78, text: 'Регистрация в Roblox', fontSize: 58, weight: 900, color: '#eafcff' }),
    makeText({ x: 62, y: 124, w: 640, h: 36, text: 'Создай аккаунт за 2 минуты', fontSize: 25, weight: 500, color: '#9beaff', opacity: 0.9 }),
    makeText({ x: 64, y: 208, w: 590, h: 170, fontSize: 24, weight: 600, color: '#ffffff',
      text: '1.  Открой roblox.com\n2.  Нажми кнопку Sign Up\n3.  Укажи дату рождения\n4.  Придумай логин и пароль\n5.  Подтверди почту — готово!' }),
    makeImage({ x: 728, y: 178, w: 476, h: 261, radius: 26, src: 'assets/img/character.png', ar: 476 / 261 }),
    makeText({ x: 64, y: 620, w: 900, h: 26, text: 'Бесплатно · PC · мобильные · консоли',
      fontSize: 18, weight: 500, italic: true, color: '#9beaff', opacity: 0.75 }),
  ]);
  const s2 = makeSlide([
    makeText({ x: 60, y: 46, w: 720, h: 78, text: 'Roblox Studio', fontSize: 58, weight: 900, color: '#eafcff' }),
    makeText({ x: 62, y: 124, w: 640, h: 36, text: 'Создавай свои миры и игры', fontSize: 25, weight: 500, color: '#9beaff', opacity: 0.9 }),
    makeText({ x: 64, y: 208, w: 560, h: 150, fontSize: 24, weight: 600, color: '#ffffff',
      text: '•  Мощный конструктор уровней\n•  Скрипты на языке Lua\n•  Свободная публикация игр\n•  Твоя игра — для миллионов игроков' }),
    makeImage({ x: 690, y: 172, w: 520, h: 285, radius: 26, src: 'assets/img/studio.png', ar: 520 / 285 }),
    makeText({ x: 64, y: 620, w: 900, h: 26, text: 'Скачай бесплатно с roblox.com/create',
      fontSize: 18, weight: 500, italic: true, color: '#9beaff', opacity: 0.75 }),
  ]);
  return { version: 2, theme: 'neon', width: SLIDE_W, height: SLIDE_H, slides: [s1, s2] };
}

/* ---------- состояние приложения ---------- */
const state = {
  project: defaultProject(),
  ui: {
    current: 0,        // индекс открытого слайда
    selected: null,    // id основного (последнего) выбранного элемента
    selectedIds: [],   // все выделенные id (Shift+клик, рамка)
    editingId: null,   // id текста, который сейчас редактируется
    present: false,    // открыта ли презентация
    presentEdit: false,// режим редактирования внутри презентации
    bgModal: false,    // модалка «Удалить фон»
    scale: 1,          // масштаб сцены редактора (итоговый)
    zoom: 1,           // зум холста: 1 = вписать, кнопки/колесо (п. зум)
    presentScale: 1,   // масштаб слайда в презентации
  },
};

/* ============================================================
   История undo/redo — стеки снимков ВНЕ state, чтобы снимки
   не включали сами себя. Снимок = { p: JSON(project), c: current }.
   ============================================================ */
const HISTORY_MAX = 50;
const past = [];    // снимки прошлых состояний project (для Ctrl+Z)
const future = [];  // отменённые (для Ctrl+Y)
let historyLock = false;      // undo/redo сами управляют стеками
let lastCommitted = null;     // последний зафиксированный снимок

function histSnap() {
  return { p: JSON.stringify(state.project), c: state.ui.current };
}

function resetHistory() {
  past.length = 0;
  future.length = 0;
  lastCommitted = histSnap();
}

const canUndo = () => past.length > 0;
const canRedo = () => future.length > 0;

/* входит ли id в текущее выделение (одиночное или множественное) */
function isSelected(id) {
  if (state.ui.selectedIds && state.ui.selectedIds.includes(id)) return true;
  return state.ui.selected === id;
}

function restoreSnapshot(snap) {
  // выделение переживает undo/redo, если его объекты есть в целевом слайде
  const keep = (state.ui.selectedIds || []).filter(id => findEl(id));
  state.project = JSON.parse(snap.p);
  state.ui.current = Math.max(0, Math.min(snap.c, state.project.slides.length - 1));
  const alive = keep.filter(id => findEl(id));
  state.ui.selectedIds = alive;
  state.ui.selected = alive.length ? alive[alive.length - 1] : null;
  state.ui.editingId = null;
}

function undo() {
  if (!past.length) return false;
  const target = past.pop();
  future.push(histSnap());
  historyLock = true;
  try { setState(() => restoreSnapshot(target)); }
  finally { historyLock = false; }
  return true;
}

function redo() {
  if (!future.length) return false;
  const target = future.pop();
  past.push(histSnap());
  historyLock = true;
  try { setState(() => restoreSnapshot(target)); }
  finally { historyLock = false; }
  return true;
}

/* ============================================================
   setState() — ЕДИНСТВЕННАЯ точка изменения состояния.
   Любое изменение: setState(mutator) → мутация → снимок в
   историю (если изменился project) → перерисовка (renderAll,
   включая chrome) → автосохранение.
   «Живой предпросмотр» внутри жестов (drag/resize, слайдеры,
   ввод текста) пишет сразу, а коммит жеста идёт через setState —
   снимок сравнивается с lastCommitted, поэтому вся правка жеста
   становится одной записью истории.
   ============================================================ */
function setState(mutator) {
  const before = lastCommitted || histSnap();
  if (typeof mutator === 'function') mutator(state);
  const after = histSnap();
  if (!historyLock && after.p !== before.p) {
    past.push(before);
    if (past.length > HISTORY_MAX) past.shift();
    future.length = 0;
  }
  lastCommitted = after;
  App.render.renderAll();
  App.storage.save();
}

lastCommitted = histSnap();

/* ---------- доступ ---------- */
const slideOf = () => state.project.slides[state.ui.current];
const findEl  = id => slideOf().elements.find(e => e.id === id);

/* ---------- нормализация ---------- */
function normalizeZ(slide) {
  slide.elements.forEach((e, i) => { e.zIndex = i; });
}

function normalizeElement(raw, i) {
  if (!raw || typeof raw !== 'object') return makeText({ zIndex: i });
  const GEOM = ['id', 'type', 'x', 'y', 'w', 'h', 'rotation', 'zIndex', 'props'];
  const flat = {};
  for (const k of Object.keys(raw)) {
    if (!GEOM.includes(k)) { flat[k] = raw[k]; delete raw[k]; }
  }
  const type = ['text', 'image', 'block', 'shape', 'icon', 'sticker'].includes(raw.type) ? raw.type : 'text';
  const props = { ...flat, ...(raw.props && typeof raw.props === 'object' ? raw.props : {}) };
  return {
    id: raw.id || uid(),
    type,
    x: num(raw.x, 60), y: num(raw.y, 60),
    w: num(raw.w, 300), h: num(raw.h, type === 'text' ? 60 : 200),
    rotation: num(raw.rotation, 0),
    zIndex: num(raw.zIndex, i),
    props: { ...defaultProps(type), ...props },
  };
}

function normalizeProject(raw) {
  if (!raw || !Array.isArray(raw.slides) || !raw.slides.length) return null;
  const slides = raw.slides.map(s => ({
    id: (s && s.id) || uid(),
    bg: (s && s.bg) || '',
    bgImage: (s && s.bgImage) || '',
    elements: Array.isArray(s && s.elements) ? s.elements.map(normalizeElement) : [],
  }));
  slides.forEach(normalizeZ);
  const w = Math.round(Number(raw.width)) || SLIDE_W;
  const h = Math.round(Number(raw.height)) || SLIDE_H;
  return {
    version: 2,
    theme: raw.theme === 'glass' ? 'glass' : 'neon',
    width: w > 100 ? w : SLIDE_W,
    height: h > 100 ? h : SLIDE_H,
    slides,
  };
}

/* Миграция: v1 {theme, slides, current} или v2 {project} → v2 project */
function migrateProject(raw) {
  if (!raw) return null;
  const proj = raw.project && Array.isArray(raw.project.slides) ? raw.project : raw;
  return normalizeProject({
    version: 2,
    theme: proj.theme,
    width: proj.width,
    height: proj.height,
    slides: proj.slides,
  });
}

/* ---------- палитра тем (чтобы текст оставался читаемым) ---------- */
const PALETTE_TO_GLASS = { '#eafcff': '#1c1c1e', '#9beaff': '#0a84ff', '#ffffff': '#1c1c1e', '#ffd166': '#bf5af2' };
const PALETTE_TO_NEON  = { '#1c1c1e': '#eafcff', '#0a84ff': '#9beaff', '#bf5af2': '#ffd166' };

function remapTextColors(theme) {
  const map = theme === 'glass' ? PALETTE_TO_GLASS : PALETTE_TO_NEON;
  state.project.slides.forEach(s => s.elements.forEach(e => {
    if (e.type === 'text' && map[e.props.color]) e.props.color = map[e.props.color];
  }));
}

App.state = state;
App.setState = setState;
App.undo = undo;
App.redo = redo;
App.canUndo = canUndo;
App.canRedo = canRedo;
App.resetHistory = resetHistory;
App.SLIDE_W = SLIDE_W;   /* база 16:9 (legacy) */
App.SLIDE_H = SLIDE_H;
App.slideW = slideW;     /* фактический размер слайда */
App.slideH = slideH;
App.SIZES = SIZES;
App.uid = uid;
App.slideOf = slideOf;
App.findEl = findEl;
App.normalizeZ = normalizeZ;
App.isSelected = isSelected;
App.normalizeElement = normalizeElement;
App.normalizeProject = normalizeProject;
App.migrateProject = migrateProject;
App.defaultProject = defaultProject;
App.makeElement = makeElement;
App.makeText = makeText;
App.makeImage = makeImage;
App.makeBlock = makeBlock;
App.makeShape = makeShape;
App.makeIcon = makeIcon;
App.makeSticker = makeSticker;
App.makeSlide = makeSlide;
App.remapTextColors = remapTextColors;

})(window.App);
