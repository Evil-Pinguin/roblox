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

let uidN = 1;
const uid = () => 'u' + (uidN++) + Date.now().toString(36).slice(-4);

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

/* ---------- дефолтные props по типам ---------- */
function defaultProps(type) {
  if (type === 'image') return { src: '', originalSrc: null, radius: 24, opacity: 1, ar: 16 / 9 };
  if (type === 'block') return { fill: 'rgba(127,127,127,.14)', radius: 22, opacity: 1 };
  return { text: '', fontSize: 36, color: '#eafcff', weight: 700, italic: false,
           align: 'left', fontFamily: '', opacity: 1 };
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

function makeElement(type, o = {}) {
  if (type === 'image') return makeImage(o);
  if (type === 'block') return makeBlock(o);
  return makeText(o);
}

function makeSlide(elements = [], bg = '') {
  const slide = { id: uid(), bg, elements };
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
  return { version: 2, theme: 'neon', slides: [s1, s2] };
}

/* ---------- состояние приложения ---------- */
const state = {
  project: defaultProject(),
  ui: {
    current: 0,        // индекс открытого слайда
    selected: null,    // id выбранного элемента
    editingId: null,   // id текста, который сейчас редактируется
    presentEdit: false,// режим редактирования внутри презентации
    scale: 1,          // масштаб сцены редактора
    presentScale: 1,   // масштаб слайда в презентации
  },
};

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
  const type = ['text', 'image', 'block'].includes(raw.type) ? raw.type : 'text';
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
    elements: Array.isArray(s && s.elements) ? s.elements.map(normalizeElement) : [],
  }));
  slides.forEach(normalizeZ);
  return {
    version: 2,
    theme: raw.theme === 'glass' ? 'glass' : 'neon',
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
App.SLIDE_W = SLIDE_W;
App.SLIDE_H = SLIDE_H;
App.uid = uid;
App.slideOf = slideOf;
App.findEl = findEl;
App.normalizeZ = normalizeZ;
App.normalizeElement = normalizeElement;
App.normalizeProject = normalizeProject;
App.migrateProject = migrateProject;
App.defaultProject = defaultProject;
App.makeElement = makeElement;
App.makeText = makeText;
App.makeImage = makeImage;
App.makeBlock = makeBlock;
App.makeSlide = makeSlide;
App.remapTextColors = remapTextColors;

})(window.App);
