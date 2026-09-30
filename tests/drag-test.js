/* Перетаскивание мышью (+ ресайз-ручка) */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;
const SLIDE_W = 1280, SLIDE_H = 720;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);   // scale 1:1 для точных asserts

const node = () => doc.querySelector('#stage .el.text');
const id = () => node().dataset.id;
const cur = () => App.slideOf().elements.find(x => x.id === id());
const se = () => doc.querySelector(`#stage .el.text[data-id="${id()}"] .handle[data-dir="se"]`);

/* 1. клик без движения — не сдвигает и выделяет */
{
  const n = node(); const x0 = cur().x, y0 = cur().y;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 301, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 301, clientY: 300 }));
  check('клик (< порога 2px) не двигает элемент', cur().x === x0 && cur().y === y0);
  check('клик выделил', App.state.ui.selected === id());
}

/* 2. drag 1:1 — координаты вне радиуса привязки (≤6px от целей) */
{
  const n = node(); const x0 = cur().x, y0 = cur().y;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: 480, clientY: 426 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: 480, clientY: 426 }));
  check('drag: x += dx', cur().x === x0 + 80);
  check('drag: y += dy', cur().y === y0 + 26);
}

/* 3. move/up вне узла (на document) доезжают до жеста */
{
  const n = node(); const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: 500, clientY: 500 }));
  doc.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientX: 560, clientY: 500 }));
  doc.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: 560, clientY: 500 }));
  check('move/up вне узла доезжают до window', cur().x === x0 + 60);
}

/* 4. pointercancel завершает жест */
{
  const n = node(); const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 4, clientX: 600, clientY: 600 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 4, clientX: 630, clientY: 600 }));
  window.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 4, clientX: 630, clientY: 600 }));
  const x1 = cur().x;
  check('cancel: сдвиг зафиксирован', x1 === x0 + 30);
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 4, clientX: 700, clientY: 600 }));
  check('cancel: обработчик снят', cur().x === x1);
}

/* 5. много move → одна запись истории */
{
  const n = node(); const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 300, clientY: 300 }));
  for (const cx of [320, 350, 400, 460])
    window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: cx, clientY: 340 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: 460, clientY: 340 }));
  App.undo();
  check('undo одного жеста возвращает старт', cur().x === x0);
  App.redo();
}

/* 6. кламп к границам */
{
  const n = node();
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 6, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 6, clientX: 99999, clientY: 99999 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 6, clientX: 99999, clientY: 99999 }));
  check('правый-низ: x ≤ SLIDE_W-40, y ≤ SLIDE_H-30',
    cur().x <= SLIDE_W - 40 && cur().y <= SLIDE_H - 30);
  const n2 = node();
  n2.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: -99999, clientY: -99999 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: -99999, clientY: -99999 }));
  check('левый-верх: не ушёл за слайд', cur().x >= -(cur().w - 40) && cur().y >= -20);
}

/* 7. масштаб 0.5 → dx 40 = +80 */
{
  setStageScale(window, 0.5);
  App.render.renderAll();
  const n = node(); const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 8, clientX: 200, clientY: 200 }));
  check('fitStage дал scale 0.5', App.state.ui.scale === 0.5);
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 8, clientX: 240, clientY: 220 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 8, clientX: 240, clientY: 220 }));
  check('при scale 0.5 сдвиг ×2', cur().x === x0 + 80);
  setStageScale(window, 1);
  App.render.renderAll();
}

/* 8. правая кнопка не двигает */
{
  const n = node(); const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 2, pointerId: 9, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, button: 2, pointerId: 9, clientX: 500, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, button: 2, pointerId: 9, clientX: 500, clientY: 300 }));
  check('правая кнопка не двигает', cur().x === x0);
}

/* 9. в правке текста drag не стартует */
{
  App.editor.select(id());
  const n = node();
  n.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  check('правка открыта', App.state.ui.editingId === id());
  const x0 = cur().x;
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 10, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 10, clientX: 420, clientY: 300 }));
  check('в правке: drag не сдвигает', cur().x === x0);
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 10, clientX: 420, clientY: 300 }));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

/* 10. презентация: view не тянется, presentEdit тянется */
{
  App.editor.openPresent();
  const pe = doc.querySelector('#presentStage .el.text');
  const x0 = App.slideOf().elements.find(x => x.id === pe.dataset.id).x;
  pe.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 11, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 11, clientX: 400, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 11, clientX: 400, clientY: 300 }));
  check('view: элемент не сдвинулся',
    App.slideOf().elements.find(x => x.id === pe.dataset.id).x === x0);

  App.editor.togglePresentEdit();
  const pe2 = doc.querySelector('#presentStage .el.text');
  pe2.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 12, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 12, clientX: 380, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 12, clientX: 380, clientY: 300 }));
  const k = App.state.ui.presentScale;
  check('presentEdit: элемент сдвинулся',
    App.slideOf().elements.find(x => x.id === pe2.dataset.id).x === Math.round(x0 + 80 / k));
  App.editor.closePresent();
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
