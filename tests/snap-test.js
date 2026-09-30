/* Привязка и направляющие: центр слайда, края других элементов */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const node = id => doc.querySelector(`#stage .el[data-id="${id}"]`);
const E = id => App.slideOf().elements.find(x => x.id === id);
const firstTextId = () => doc.querySelector('#stage .el.text').dataset.id;
const guides = () => doc.querySelectorAll('#stage .guide.on');

function drag(id, x0, y0, dx, dy) {
  const n = node(id);
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: x0, clientY: y0 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: x0 + dx, clientY: y0 + dy }));
}

/* 1. привязка к центру слайда (x): центр элемента в пределах 6px от 640 */
{
  const id = firstTextId();
  const w = E(id).w;                       // 720 → центр = x + 360
  App.setState(() => { E(id).x = 640 - w / 2 - 3; });  // центр 637 — рядом
  App.render.renderAll();
  const y0 = E(id).y;
  drag(id, 100, 100, 2, 26);               // dx маленький → центр 639+… → snap к 640
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 102, clientY: 126 }));
  check('центр слайда: x зафиксирован ровно на 640', E(id).x + w / 2 === 640);
  check('y без привязки проехал на 26', E(id).y === y0 + 26);
  check('направляющие убраны после отпускания', doc.querySelectorAll('#stage .guide').length === 0);
  App.undo();
}

/* 2. направляющая рисуется во время жеста, вертикальная на 640 */
{
  const id = firstTextId();
  const w = E(id).w;
  App.setState(() => { E(id).x = 640 - w / 2 - 3; });
  App.render.renderAll();
  drag(id, 100, 100, 2, 26);
  const gv = doc.querySelector('#stage .guide-v.on');
  check('вертикальная направляющая показана', !!gv);
  check('направляющая на x=640', gv && gv.style.left === '640px');
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  App.undo();
}

/* 3. привязка к краю другого элемента: правый край sub (x+w) */
{
  const sub = App.slideOf().elements[1];           // «Создай аккаунт…» x62 w640 → правый 702
  const edge = sub.x + sub.w;
  const id = App.slideOf().elements[2].id;         // третий текст
  App.setState(() => { E(id).x = edge + 2; });     // левый край в 2px от правого края sub
  App.render.renderAll();
  const x0 = E(id).x;
  drag(id, 100, 100, 0, 20);                      // сдвиг по y → moved, x почти не двигался
  // после base-позиции x=x0, левый край距 edge = 2 ≤6 → snap к edge
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  check('край другого элемента: x привязан', E(id).x === edge);
  App.undo();
}

/* 4. привязка к центру другого элемента по Y */
{
  const target = App.slideOf().elements[1];
  const cY = target.y + (target.h || 0) / 2;
  const id = App.slideOf().elements[2].id;
  const h = E(id).h || 0;
  App.setState(() => { E(id).y = cY - h / 2 + 3; }); // ЦЕНТР в 3px от центра цели
  App.render.renderAll();
  drag(id, 100, 100, 30, 0);
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  check('центр другого элемента (y) привязан', E(id).y + h / 2 === cY);
  App.undo();
}

/* 5. далеко от всех целей — без привязки и без направляющих */
{
  const id = firstTextId();
  App.setState(() => { E(id).x = 300; E(id).y = 460; });  // дальше 6px от всех целей
  App.render.renderAll();
  const x0 = E(id).x, y0 = E(id).y;
  drag(id, 100, 100, 5, 5);
  const gv = doc.querySelectorAll('#stage .guide.on');
  check('вдали от целей: направляющих нет', gv.length === 0);
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  check('без привязки: чистый дельта', E(id).x === x0 + 5 && E(id).y === y0 + 5);
  App.undo();
}

/* 6. привязка не мешает откату: undo возвращает исходное */
{
  const id = firstTextId();
  const x0 = E(id).x;
  App.undo(); App.redo();
  check('позиция стабильна после undo/redo', E(id).x === x0);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
