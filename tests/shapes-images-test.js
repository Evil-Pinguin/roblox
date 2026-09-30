/* Этап 3.20–22: фигуры (rect/oval/line/arrow/star), их свойства, фото (файл/Ctrl+V/drop) */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const E = id => App.slideOf().elements.find(x => x.id === id);
const shapes = () => App.slideOf().elements.filter(x => x.type === 'shape');
const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new window.Event(type));
const addBtn = a => doc.querySelector(`#propsPanel [data-a="${a}"]`);

/* ---------- 20. Фигуры:5 кнопок →5 типов ---------- */
{
  App.editor.select(null);
  for (const a of ['text', 'image', 'block', 'slide']) check(`кнопка ${a} на месте`, !!addBtn(a));
  const kinds = ['rect', 'oval', 'line', 'arrow', 'star'];
  for (const k of kinds) check(`кнопка фигуры ${k}`, !!addBtn(`shape-${k}`));
}
{
  const n0 = App.slideOf().elements.length;
  for (const k of ['rect', 'oval', 'line', 'arrow', 'star']) {
    App.editor.select(null);   // после добавления панель переключается на свойства фигуры
    addBtn(`shape-${k}`).click();
  }
  check('добавлено5 фигур', App.slideOf().elements.length === n0 + 5 && shapes().length >= 5);
  const fresh = shapes().slice(-5);
  check('типы совпали по порядку', fresh.every((e, i) => e.props.shape === ['rect', 'oval', 'line', 'arrow', 'star'][i]));
  const nodeOf = id => doc.querySelector(`#stage .el.shape[data-id="${id}"]`);
  const svgOf = id => nodeOf(id) && nodeOf(id).querySelector('svg.shape-svg');
  check('rect: <rect> в svg', !!svgOf(fresh[0].id).querySelector('rect'));
  check('oval: <ellipse> в svg', !!svgOf(fresh[1].id).querySelector('ellipse'));
  check('line: <line> в svg', !!svgOf(fresh[2].id).querySelector('line'));
  check('arrow: три <line> (shaft + голова)', svgOf(fresh[3].id).querySelectorAll('line').length === 3);
  check('star: <polygon> + viewBox', !!svgOf(fresh[4].id).querySelector('polygon') &&
    svgOf(fresh[4].id).getAttribute('viewBox') === '0 0 100 100');
  check('line-толщина по умолчанию5', fresh[2].props.strokeWidth === 5);
}

/* ---------- 21. Заливка, обводка, скругление, прозрачность ---------- */
{
  const rect = shapes().find(e => e.props.shape === 'rect');
  App.editor.select(rect.id);
  const node = () => doc.querySelector(`#stage .el.shape[data-id="${rect.id}"]`);
  const svg = () => node().querySelector('svg.shape-svg');
  check('панель фигуры: типы (5 кнопок)', doc.querySelectorAll('#propsPanel [data-sh]').length === 5);
  check('активен rect', $p('[data-sh="rect"]').classList.contains('active'));

  /* заливка */
  const fill = $p('#pFill');
  fill.value = '#ff00aa'; fire(fill, 'input');
  check('заливка в модели', E(rect.id).props.fill === '#ff00aa');
  check('заливка в svg', svg().querySelector('rect').getAttribute('fill') === '#ff00aa');
  fire(fill, 'change');

  /* свотч */
  doc.querySelector('#pShSw .swatch[data-c="#ffd166"]').click();
  check('свотч заливки', E(rect.id).props.fill === '#ffd166' && svg().querySelector('rect').getAttribute('fill') === '#ffd166');

  /* обводка */
  const sw = $p('#pStrokeW');
  sw.value = '4'; fire(sw, 'input');
  check('обводка 4 в модели', E(rect.id).props.strokeWidth === 4);
  check('stroke-width в svg', svg().querySelector('rect').getAttribute('stroke-width') === '4');
  const sc = $p('#pStrokeColor');
  sc.value = '#001122'; fire(sc, 'input'); fire(sc, 'change');
  check('цвет обводки', svg().querySelector('rect').getAttribute('stroke') === '#001122');
  sw.value = '0'; fire(sw, 'input');
  check('обводка0 = нет атрибута stroke', svg().querySelector('rect').getAttribute('stroke-width') === null);

  /* скругление */
  const rad = $p('#pRadius');
  rad.value = '33'; fire(rad, 'input');
  check('rx=33 в svg', svg().querySelector('rect').getAttribute('rx') === '33');

  /* прозрачность */
  const op = $p('#pOpacity');
  op.value = '50'; fire(op, 'input');
  check('прозрачность на узле', node().style.opacity === '0.5');

  /* смена типа в панели */
  $p('[data-sh="star"]').click();
  check('тип сменился на star', E(rect.id).props.shape === 'star');
  check('svg перестроен в polygon', !!doc.querySelector(`#stage .el.shape[data-id="${rect.id}"] svg.shape-svg polygon`));
  $p('[data-sh="rect"]').click();
  check('обратно rect', E(rect.id).props.shape === 'rect');

  /* у линии своя панель: толщина без цвета обводки и без радиуса */
  const line = shapes().find(e => e.props.shape === 'line');
  App.editor.select(line.id);
  check('линия: есть толщина', !!$p('#pStrokeW'));
  check('линия: нет цвета обводки', !$p('#pStrokeColor'));
  check('линия: нет скругления', !$p('#pRadius'));
  const lw = $p('#pStrokeW');
  lw.value = '8'; fire(lw, 'input');
  check('толщина линии в svg', doc.querySelector(`#stage .el.shape[data-id="${line.id}"] line`)
    .getAttribute('stroke-width') === '8');
}

/* ---------- 22. Фото: file / Ctrl+V / drop ---------- */
{
  /* ядро: вставка готового data-URL */
  const n0 = App.slideOf().elements.length;
  App.editor.addImageFromSrc('data:image/png;base64,iVBORw0KGgo=', 1.5);
  check('addImageFromSrc добавил фото', App.slideOf().elements.length === n0 + 1);
  const img = App.slideOf().elements[App.slideOf().elements.length - 1];
  check('тип image', img.type === 'image' && img.props.src.startsWith('data:image/'));

  /* кнопка «＋ Фото» не падает (откроет file dialog) */
  App.editor.select(null);
  addBtn('image').click();
  check('pickImage не упал', errs.length === 0);

  /* Ctrl+C → paste (пустой системный буфер) → внутренний clipboard */
  App.editor.select(img.id);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
  const n1 = App.slideOf().elements.length;
  doc.dispatchEvent(new window.Event('paste', { bubbles: true }));
  check('paste вставил из внутреннего буфера', App.slideOf().elements.length === n1 + 1);
  App.undo();

  /* paste с картинкой в системном буфере → ветка фото, НЕ дублирование элементов */
  const n2 = App.slideOf().elements.length;
  const file = new window.File(['x'], 'shot.png', { type: 'image/png' });
  const ev = new window.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clipboardData', { value: { files: [file], items: [] } });
  doc.dispatchEvent(ev);
  check('paste с картинкой не вставляет элементы', App.slideOf().elements.length === n2);
  check('paste с картинкой не упал', errs.length === 0);

  /* drop: с файлом и без dataTransfer */
  const d1 = new window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(d1, 'dataTransfer', { value: { files: [file] } });
  doc.dispatchEvent(d1);
  check('drop с файлом не упал', errs.length === 0);
  const d2 = new window.Event('drop', { bubbles: true, cancelable: true });
  doc.dispatchEvent(d2);
  check('drop без dataTransfer не упал', errs.length === 0);

  /* система: paste в поле ввода не перехватывается */
  const ta = doc.createElement('textarea');
  doc.body.appendChild(ta);
  const n3 = App.slideOf().elements.length;
  const ev3 = new window.Event('paste', { bubbles: true });
  Object.defineProperty(ev3, 'clipboardData', { value: { files: [file], items: [] } });
  ta.dispatchEvent(ev3);
  check('paste в поле — нативный (ничего не добавлено)', App.slideOf().elements.length === n3);
  ta.remove();
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
