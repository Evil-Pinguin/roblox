/* Множественное выделение: Shift+клик, рамка мышью; Ctrl+C/V/D */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const vp = () => doc.querySelector('#stageViewport');
const elNode = id => doc.querySelector(`#stage .el[data-id="${id}"]`);
const texts = () => [...doc.querySelectorAll('#stage .el.text')];
const E = id => App.slideOf().elements.find(x => x.id === id);
const selIds = () => App.state.ui.selectedIds.slice();
const key = (k, init = {}) =>
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
/* каждый pointerdown в тесте обязан завершаться pointerup — иначе
   «висячие» обработчики жеста сработают на чужих движениях */
const downUp = (el, init = {}, pid) => {
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: pid, ...init }));
  window.dispatchEvent(new window.PointerEvent('pointerup', {
    bubbles: true, pointerId: pid,
    clientX: init.clientX != null ? init.clientX + 1 : 10,
    clientY: init.clientY != null ? init.clientY : 10,
  }));
};

/* ожидаемое попадание рамки — независимая математика по модели */
function expectHits(L, T, Rr, B) {
  return App.slideOf().elements.filter(e => {
    const el = e.x, et = e.y, er = e.x + e.w, eb = e.y + (e.h || 1);
    return L < er && Rr > el && T < eb && B > et;
  }).map(e => e.id).sort();
}

/* ---------- Shift+клик ---------- */
{
  const [t1, t2] = texts();
  downUp(t1, {}, 1);
  check('обычный клик: одиночное выделение',
    App.state.ui.selected === t1.dataset.id && selIds().length === 1);

  downUp(t2, { shiftKey: true }, 2);
  check('Shift+клик: два в выделении', selIds().length === 2 &&
    selIds().includes(t1.dataset.id) && selIds().includes(t2.dataset.id));
  check('оба с классом .selected',
    t1.classList.contains('selected') && t2.classList.contains('selected'));
  check('основной — последний кликнутый', App.state.ui.selected === t2.dataset.id);

  downUp(t2, { shiftKey: true }, 3);
  check('Shift+клик по члену: убран из группы', selIds().length === 1 &&
    selIds()[0] === t1.dataset.id);

  downUp(t1, { shiftKey: true }, 4);
  check('снятие последнего: выделение пусто',
    selIds().length === 0 && App.state.ui.selected === null);
}

/* ---------- рамка мышью ---------- */
{
  vp().dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 0, clientY: 0 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: 700, clientY: 700 }));
  const expected = expectHits(0, 0, 700, 700);
  check('рамка подсвечивает попавшие', doc.querySelectorAll('#stage .el.marquee-hit').length === expected.length);
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: 700, clientY: 700 }));
  check('рамка выделила ровно пересечённые', selIds().sort().join() === expected.join());
  check('подсветка снята после отпускания', doc.querySelectorAll('#stage .el.marquee-hit').length === 0);

  // клик по фону без движения — снять
  downUp(vp(), { clientX: 50, clientY: 50 }, 6);
  check('клик по фону снимает выделение', selIds().length === 0);

  // Shift+рамка — добавить к текущему
  const first = App.slideOf().elements[0].id;
  App.editor.select(first);
  vp().dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 0, clientY: 0, shiftKey: true }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 700, clientY: 700 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 700, clientY: 700 }));
  const union = new Set([first, ...expectHits(0, 0, 700, 700)]);
  check('Shift+рамка: объединение', selIds().length === union.size &&
    selIds().every(id => union.has(id)));
}

/* ---------- групповое перетаскивание ---------- */
{
  const ids = selIds();
  check('в группе ≥2 элемента', ids.length >= 2);
  const before = ids.map(id => ({ id, x: E(id).x, y: E(id).y }));
  const anchor = elNode(ids[0]);
  anchor.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 81, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 81, clientX: 350, clientY: 320 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 81, clientX: 350, clientY: 320 }));
  check('группа сдвинулась целиком', before.every(b => {
    const e = E(b.id);
    return e.x === b.x + 50 && e.y === b.y + 20;
  }));
  App.undo();
  check('undo возвращает всю группу', before.every(b => E(b.id).x === b.x && E(b.id).y === b.y));

  // клик по члену группы без Shift не схлопывает выделение
  downUp(elNode(ids[0]), { clientX: 300, clientY: 300 }, 9);
  check('клик по члену сохраняет группу', selIds().length === before.length);
}

/* ---------- Ctrl+C / Ctrl+V ---------- */
{
  const ids = selIds();
  const n0 = App.slideOf().elements.length;
  key('c', { ctrlKey: true });
  check('Ctrl+C скопировал', doc.querySelector('#toast').textContent.includes('Скопировано'));

  doc.dispatchEvent(new window.Event('paste', { bubbles: true }));   // путь Ctrl+V теперь через событие paste
  check('Ctrl+V вставил копии', App.slideOf().elements.length === n0 + ids.length);
  const pasted = selIds();
  check('выделены вставленные', pasted.length === ids.length &&
    pasted.every(id => !ids.includes(id)));
  const src0 = E(ids[0]);
  const p0 = E(pasted[0]);
  check('сдвиг вставки +16', p0.x === src0.x + 16 && p0.y === src0.y + 16);

  App.undo();
  check('undo одной вставки', App.slideOf().elements.length === n0);
}

/* ---------- Ctrl+D ---------- */
{
  const n0 = App.slideOf().elements.length;
  const cnt = selIds().length;
  key('d', { ctrlKey: true });
  check('Ctrl+D продублировал выделение', App.slideOf().elements.length === n0 + cnt);
  App.undo();
  check('undo дубля', App.slideOf().elements.length === n0);
}

/* ---------- Delete на всё выделение ---------- */
{
  const ids = selIds();
  const n0 = App.slideOf().elements.length;
  key('Delete');
  check('Delete удалил всё выделенное', App.slideOf().elements.length === n0 - ids.length &&
    App.state.ui.selected === null);
  App.undo();
  check('undo удаления вернул всё', App.slideOf().elements.length === n0 &&
    selIds().length === ids.length);
}

/* ---------- копировать нечего ---------- */
{
  App.editor.select(null);
  const n0 = App.slideOf().elements.length;
  key('c', { ctrlKey: true });
  check('Ctrl+C без выделения: тост', doc.querySelector('#toast').textContent.includes('Нечего копировать'));
  check('проект не изменился', App.slideOf().elements.length === n0);
}

/* ---------- в поле ввода — нативные Ctrl+C/V/D ---------- */
{
  const t = texts()[0];
  downUp(t, {}, 10);
  t.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  const ta = doc.querySelector('#propsPanel #pText');
  if (ta) {
    const n0 = App.slideOf().elements.length;
    ta.dispatchEvent(new window.Event('paste', { bubbles: true }));   // paste в поле — нативный, не перехватываем
    check('Ctrl+V в поле не вставляет в слайд', App.slideOf().elements.length === n0);
    ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
    check('Ctrl+D в поле не дублирует', App.slideOf().elements.length === n0);
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  } else check('textarea есть', false);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
