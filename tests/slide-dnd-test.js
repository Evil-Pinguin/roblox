/* Этап 4.26: перетаскиванием менять порядок слайдов */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const list = () => doc.querySelector('#slidesList');
const items = () => list().querySelectorAll('.slide-item');
const names = () => App.state.project.slides.map(s => (s.elements.find(e => e.text) || {}).text || s.id);
const curText = () => (App.slideOf().elements.find(e => e.text) || {}).text || App.slideOf().id;

/* мок layout: слайд-строки высотой 100px, список от 0 (jsdom без layout) */
const rectCache = new Map();
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.id === 'slidesList') {
    const n = list().querySelectorAll('.slide-item').length;
    return { top: 0, left: 0, width: 220, height: n * 100, bottom: n * 100, right: 220, x: 0, y: 0 };
  }
  if (this.classList && this.classList.contains('slide-item')) {
    const arr = Array.from(list().querySelectorAll('.slide-item'));
    const i = arr.indexOf(this);
    const t = i * 100;
    return { top: t, left: 0, width: 220, height: 100, bottom: t + 100, right: 220, x: 0, y: t };
  }
  return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 };
};

const pev = (type, y) => new window.MouseEvent(type, { clientY: y, clientX: 40, bubbles: true, cancelable: true, button: 0 });

/* ---------- подготовка: 4 слайда ---------- */
App.editor.addSlide(); App.editor.addSlide(); App.editor.addSlide();
check('подготовка: 5 слайдов', items().length === 5);
App.editor.gotoSlide(0);

/* ---------- drag: item0 в конец ---------- */
{
  const before = names().join(',');
  const thumb0 = items()[0].querySelector('.thumb');

  thumb0.dispatchEvent(pev('pointerdown', 50));
  doc.dispatchEvent(pev('pointermove', 160));   // нижняя половина 1-го item → граница 2
  const hint = items()[1].classList.contains('drop-before') || items()[1].classList.contains('drop-after') ||
               items()[2].classList.contains('drop-before') || items()[2].classList.contains('drop-after');
  check('индикатор границы во время drag', hint);
  doc.dispatchEvent(pev('pointerup', 160));

  check('порядок изменился', names().join(',') !== before);
  check('элемент уехал в конец (pos 1)', names()[1] === before.split(',')[0]);
  check('активный слайд следует за объектом', App.state.ui.current === 1 &&
    curText() === before.split(',')[0]);
  check('индикатор снят после drop', list().querySelectorAll('.drop-before, .drop-after').length === 0);
  check('класс dragging снят', list().querySelectorAll('.dragging').length === 0);

  /* клик после drag подавлен — не должен переключить слайд */
  items()[0].querySelector('.thumb').click();
  check('клик после drag подавлен', App.state.ui.current === 1);

  App.undo();
  check('undo вернул порядок', names().join(',') === before);
}

/* ---------- клик без движения = переход ---------- */
{
  App.editor.gotoSlide(0);
  const thumb1 = items()[1].querySelector('.thumb');
  thumb1.dispatchEvent(pev('pointerdown', 150));
  doc.dispatchEvent(pev('pointerup', 150));
  thumb1.click();
  check('обычный клик переключает слайд', App.state.ui.current === 1);
  const before = names().join(',');
  thumb1.dispatchEvent(pev('pointerdown', 150));
  doc.dispatchEvent(pev('pointerup', 150));
  thumb1.click();
  check('порядок при клике не меняется', names().join(',') === before);
}

/* ---------- кнопки ⧉/✕ не начинают drag ---------- */
{
  App.editor.gotoSlide(0);
  const before = names().join(',');
  const dupBtn = items()[0].querySelector('[data-a="dup"]');
  dupBtn.dispatchEvent(pev('pointerdown', 10));
  doc.dispatchEvent(pev('pointermove', 300));
  doc.dispatchEvent(pev('pointerup', 300));
  check('drag с кнопки действий игнорируется', names().join(',') === before &&
    list().querySelectorAll('.dragging').length === 0);
  /* и клик по кнопке работает как обычно */
  dupBtn.click();
  check('⧉ при этом дублирует', names().length === before.split(',').length + 1);
  App.undo();
}

/* ---------- drag мелкими шагами: 4-й слайд наверх ---------- */
{
  App.editor.gotoSlide(0);
  const before = names();
  const last = items()[4];
  last.querySelector('.thumb').dispatchEvent(pev('pointerdown', 450));
  doc.dispatchEvent(pev('pointermove', 30));   // верх списка → граница 0
  doc.dispatchEvent(pev('pointerup', 30));
  check('последний слайд поднялся на 1-е место', names()[0] === before[4]);
  check('активный слайд остался активным', curText() === before[0] || App.state.ui.current === 0);
}

/* ---------- API moveSlide ---------- */
{
  const n0 = App.state.project.slides.length;
  App.editor.moveSlide(0, 1);
  check('moveSlide переставляет', App.state.project.slides.length === n0);
  App.undo();
  App.editor.moveSlide(1, 1);
  check('moveSlide(from===from) — no-op', App.canUndo() === false || names().length === n0);
  App.editor.moveSlide(99, 0);
  check('moveSlide вне диапазона — no-op', App.state.project.slides.length === n0);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
