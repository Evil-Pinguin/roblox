/* Слои (наверх/вниз), удаление, блокировка, группировка Ctrl+G */
const { check, finish, makeDom, setStageScale } = require('./helpers');
const fs = require('fs');
const path = require('path');
const { root } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const order = () => App.slideOf().elements.map(e => e.id);
const E = id => App.slideOf().elements.find(x => x.id === id);
const node = id => doc.querySelector(`#stage .el[data-id="${id}"]`);
const downUp = (el, init = {}, pid = 1) => {
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: pid, ...init }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: pid, clientX: 10, clientY: 10 }));
};
const key = (k, init = {}) =>
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

/* ---------- 6. порядок слоёв ---------- */
{
  const [a] = order();
  App.editor.select(a);
  App.editor.layerSel('up');
  check('слой вверх: элемент поднялся', order()[1] === a && order()[0] !== a);
  App.editor.layerSel('down');
  check('слой вниз: вернулся', order()[0] === a);

  // многослойное: выделяем 0-й и 2-й, «наверх»
  const ids = order();
  App.editor.setSelection([ids[0], ids[2]]);
  App.editor.layerSel('up');
  const o = order();
  check('многослойное вверх: блок поднялся', o.indexOf(ids[0]) === 1 && o.indexOf(ids[2]) === 3);
  App.undo();
  check('undo слоя вернул порядок', order().join() === ids.join());
}

/* ---------- удаление (Del) на выделение ---------- */
{
  const ids = order();
  App.editor.setSelection([ids[0], ids[1]]);
  key('Delete');
  check('Del удалил выделенные', !order().includes(ids[0]) && !order().includes(ids[1]));
  App.undo();
  check('undo Del вернул оба', order().join() === ids.join());
}

/* ---------- 8. блокировка ---------- */
{
  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  check('CSS: ручки скрыты у заблокированного', /\.el\.locked \.handle/.test(css));

  const id = order()[0];
  App.editor.select(id);
  App.editor.toggleLock();
  check('props.locked = true', E(id).props.locked === true);
  check('класс .locked на узле', node(id).classList.contains('locked'));

  // drag заблокированного — не двигает
  const x0 = E(id).x;
  downUp(node(id), { clientX: 300, clientY: 300 }, 2);
  node(id).dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientX: 400, clientY: 320 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: 400, clientY: 320 }));
  check('drag заблокированного не двигает', E(id).x === x0);

  // resize-ручка заблокированного — не двигает
  const w0 = E(id).w;
  const h = node(id).querySelector('.handle[data-dir="se"]');
  h.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 4, clientX: 500, clientY: 500 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 4, clientX: 560, clientY: 560 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 4, clientX: 560, clientY: 560 }));
  check('resize заблокированного не двигает', E(id).w === w0);

  // поворот заблокированного
  const rot = node(id).querySelector('.handle-rot');
  rot.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 100, clientY: 0 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: 0, clientY: 100 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: 0, clientY: 100 }));
  check('поворот заблокированного не работает', !E(id).rotation);

  // Del заблокированного — блок
  const n0 = order().length;
  key('Delete');
  check('Del заблокированного заблокирован', order().length === n0 &&
    doc.querySelector('#toast').textContent.includes('заблокирован'));

  // смешанное выделение: удаляются только незаблокированные
  const free = order().find(x => x !== id);
  App.editor.setSelection([id, free]);
  key('Delete');
  check('смешанное: свободный удалён, блок остался',
    !order().includes(free) && order().includes(id));
  check('после Del блок остался выделённым', App.state.ui.selectedIds.join() === id);

  // разблокировка → drag работает
  App.editor.toggleLock();
  check('разблокирован', !E(id).props.locked);
  const x1 = E(id).x;
  node(id).dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 6, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 6, clientX: 360, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 6, clientX: 360, clientY: 300 }));
  check('после разблокировки drag работает', Math.abs(E(id).x - (x1 + 60)) <= 6);
  App.undo(); App.undo();   // откат drag + смешанного удаления? — просто выравниваем ниже
}

/* ---------- 8. группировка Ctrl+G ---------- */
{
  // приводим к чистому состоянию
  while (App.canUndo()) App.undo();
  const ids = order();
  App.editor.setSelection([ids[0], ids[1]]);
  key('g', { ctrlKey: true });
  check('Ctrl+G: общая groupId', !!E(ids[0]).props.groupId &&
    E(ids[0]).props.groupId === E(ids[1]).props.groupId);
  check('третий не в группе', !E(ids[2]).props.groupId);

  // обычный клик по члену — выделяет всю группу
  downUp(node(ids[0]), {}, 7);
  check('клик по члену выделяет группу', App.state.ui.selectedIds.length === 2 &&
    App.state.ui.selectedIds.includes(ids[0]) && App.state.ui.selectedIds.includes(ids[1]));

  // drag члена двигает всю группу
  const b0 = E(ids[0]).x, b1 = E(ids[1]).x;
  node(ids[0]).dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 8, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 8, clientX: 340, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 8, clientX: 340, clientY: 300 }));
  check('drag двигает группу целиком', E(ids[0]).x === b0 + 40 && E(ids[1]).x === b1 + 40);

  // клик по постороннему — схлопывается в него
  downUp(node(ids[2]), {}, 9);
  check('клик по постороннему — одиночное', App.state.ui.selectedIds.length === 1 &&
    App.state.ui.selectedIds[0] === ids[2]);

  // Ctrl+Shift+G
  App.editor.setSelection([ids[0], ids[1]]);
  key('g', { ctrlKey: true, shiftKey: true });
  check('Ctrl+Shift+G разгруппировал', !E(ids[0]).props.groupId && !E(ids[1]).props.groupId);
  downUp(node(ids[2]), {}, 10);            // схлопнуть выделение в одиночный элемент
  downUp(node(ids[0]), {}, 11);
  check('после разгруппировки клик одиночный',
    App.state.ui.selectedIds.length === 1 && App.state.ui.selectedIds[0] === ids[0]);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
