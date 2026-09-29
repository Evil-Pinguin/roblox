/* Этап 1: ручки изменения размера (8 точек) + поворот (ручка сверху) */
const { check, finish, makeDom, setStageScale, root } = require('./helpers');
const fs = require('fs');
const path = require('path');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;
const SLIDE_W = 1280, SLIDE_H = 720;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const textId = () => doc.querySelector('#stage .el.text').dataset.id;
const T = () => App.slideOf().elements.find(x => x.id === textId());
const handle = dir => doc.querySelector(`#stage .el.text .handle[data-dir="${dir}"]`);

/* ---------- 6. восемь точек ресайза ---------- */

{
  const one = doc.querySelector('#stage .el.text');
  const n8 = one.querySelectorAll('.handle[data-dir]');
  check('8 ручек ресайза на элементе', n8.length === 8);
  const got = [...n8].map(h => h.dataset.dir).sort().join(',');
  check('все направления на месте', got === [...DIRS].sort().join(','));
  check('ручка поворота сверху есть', !!doc.querySelector('#stage .el.text .handle-rot'));

  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  check('CSS: показ только у выделенного', /\.el\.selected \.handle/.test(css) &&
    /\.el\.selected \.handle-rot/.test(css));
  check('CSS: курсоры по направлениям', ['nwse', 'nesw', 'ns-resize', 'ew-resize']
    .every(c => css.includes(c)));
  check('CSS: у текста спрятаны n/s (высота от содержимого)',
    /\.el\.text \.handle\[data-dir="n"\]/.test(css));
  check('CSS: в правке ручки скрыты', /\.el\.editing \.handle/.test(css));
}

/* se: базовый сценарий — ширина вправо, позиция не двигается */
{
  App.editor.select(textId());
  const x0 = T().x, y0 = T().y, w0 = T().w;
  handle('se').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 500, clientY: 430 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 500, clientY: 430 }));
  check('se: ширина +dx', T().w === w0 + 100);
  check('se: позиция не изменилась', T().x === x0 && T().y === y0);
}

/* e / w */
{
  let w0 = T().w, x0 = T().x;
  handle('e').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: 480, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: 480, clientY: 400 }));
  check('e: ширина +dx, x тот же', T().w === w0 + 80 && T().x === x0);

  w0 = T().w; x0 = T().x;
  handle('w').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: x0, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientX: x0 - 40, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: x0 - 40, clientY: 400 }));
  check('w: тянем влево → шире, левый край следует', T().w === w0 + 40 && T().x === x0 - 40);
}

/* n/s на тексте: дёргаем — не должно меняться (CSS прячет + JS guard) */
{
  const y0 = T().y, h0 = T().h, w0 = T().w;
  handle('n').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 4, clientX: 400, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 4, clientX: 400, clientY: 500 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 4, clientX: 400, clientY: 500 }));
  check('текст: n/s не меняют геометрию', T().y === y0 && T().h === h0 && T().w === w0);
}

/* ресайз коммитится одной записью истории */
{
  const w0 = T().w;
  handle('e').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 500, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: 530, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: 560, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: 560, clientY: 400 }));
  check('resize вырос', T().w === w0 + 60);
  App.undo();
  check('undo resize вернул ширину', T().w === w0);
  App.redo();
}

/* блок: независимые w/h, все стороны */
{
  App.editor.addBlock();
  const blocks = doc.querySelectorAll('#stage .el.block');
  check('блок добавлен', blocks.length >= 1);
  const bNode = [...doc.querySelectorAll('#stage .el.block')].pop();
  const bId = bNode.dataset.id;
  const B = () => App.slideOf().elements.find(x => x.id === bId);
  App.editor.select(bId);
  const bh = dir => doc.querySelector(`#stage .el.block[data-id="${bId}"] .handle[data-dir="${dir}"]`);

  let x0 = B().x, y0 = B().y, w0 = B().w, h0 = B().h;
  bh('n').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 6, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 6, clientX: 300, clientY: 240 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 6, clientX: 300, clientY: 240 }));
  check('блок n: высота +60, верх поднялся', B().h === h0 + 60 && B().y === y0 - 60 && B().w === w0 && B().x === x0);

  y0 = B().y; h0 = B().h;
  bh('s').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 300, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 300, clientY: 450 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 300, clientY: 450 }));
  check('блок s: высота +50, низ не двигался', B().h === h0 + 50 && B().y === y0);

  x0 = B().x; w0 = B().w;
  bh('w').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 8, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 8, clientX: 260, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 8, clientX: 260, clientY: 300 }));
  check('блок w: шире на 40, левый край ушёл влево', B().w === w0 + 40 && B().x === x0 - 40);

  App.undo(); App.undo(); App.undo();  // откат блока
}

/* изображение: пропорции сохраняются, n/s центрирует по ширине */
{
  App.setState(() => {
    const img = App.makeImage({ x: 300, y: 300, w: 300, h: 200, radius: 10, src: 'assets/img/character.png', ar: 1.5 });
    App.slideOf().elements.push(img);
  });
  const iNode = [...doc.querySelectorAll('#stage .el.image')].pop();  // своя, добавленная
  const iId = iNode.dataset.id;
  const I = () => App.slideOf().elements.find(x => x.id === iId);
  App.editor.select(iId);
  const ih = dir => doc.querySelector(`#stage .el.image[data-id="${iId}"] .handle[data-dir="${dir}"]`);

  const ar0 = I().w / I().h;
  const w0 = I().w, h0 = I().h, x0 = I().x, y0 = I().y;
  ih('e').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 9, clientX: 600, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientX: 690, clientY: 400 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 9, clientX: 690, clientY: 400 }));
  check('картинка e: ширина +90', I().w === w0 + 90);
  check('картинка: пропорция сохранилась', Math.abs(I().w / I().h - ar0) < 0.02);
  check('картинка e: x/y на месте', I().x === x0 && I().y === y0);

  const w1 = I().w, h1 = I().h, x1 = I().x;
  // тянем северный край ВВЕРХ (dy < 0) → высота растёт
  ih('n').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 10, clientX: 450, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 10, clientX: 450, clientY: 260 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 10, clientX: 450, clientY: 260 }));
  check('картинка n (вверх): высота выросла, пропорция цела',
    I().h > h1 && Math.abs(I().w / I().h - ar0) < 0.02);
  check('картинка n: осталась по центру по горизонтали',
    I().x === x1 + Math.round((w1 - I().w) / 2));
}

/* ---------- 7. поворот ---------- */

{
  const rot = doc.querySelector('#stage .el.text .handle-rot');
  App.editor.select(textId());
  const r0 = T().rotation || 0;
  // jsdom: getBoundingClientRect → 0,0 → центр (0,0); (100,0)→(0,100) = +90°
  rot.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 11, clientX: 100, clientY: 0 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 11, clientX: 0, clientY: 100 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 11, clientX: 0, clientY: 100 }));
  check('поворот на +90°', T().rotation === r0 + 90);
  const node = doc.querySelector(`#stage .el.text[data-id="${textId()}"]`);
  check('transform на узле', node.style.transform === `rotate(${T().rotation}deg)`);

  App.undo();
  check('undo поворота', (T().rotation || 0) === r0);
  App.redo();
  check('redo поворота', T().rotation === r0 + 90);
}

{
  // нормализация: 170° + 20° → 190° → −170°
  App.setState(() => { T().rotation = 170; });
  App.render.renderAll();
  const rot = doc.querySelector(`#stage .el.text[data-id="${textId()}"] .handle-rot`);
  rot.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 12, clientX: 100, clientY: 0 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 12, clientX: 94, clientY: 34 })); // ≈+20°
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 12, clientX: 94, clientY: 34 }));
  const r = T().rotation;
  check('угол нормализован в (-180,180]', r === -170 || r === -169);
  App.undo();  // откат к 170
  App.undo();  // и глубже — выйти к состоянию без хвостов
}

/* поворот переживает смену темы (transform из модели) */
{
  App.setState(() => { App.state.project.theme = 'glass'; });
  App.render.renderAll();
  const node = doc.querySelector(`#stage .el.text[data-id="${textId()}"]`);
  check('поворот пережил рендер темы', node.style.transform.includes('rotate'));
  App.setState(() => { App.state.project.theme = 'neon'; });
}

/* presentEdit: ручки доступны и в презентации */
{
  App.editor.openPresent();
  const pe = doc.querySelector('#presentStage .el.text');
  check('view: ручек нет (узлы не интерактивны)', !pe.querySelector('.handle'));
  App.editor.togglePresentEdit();
  const pe2 = doc.querySelector('#presentStage .el.text');
  check('presentEdit: 8 ручек + поворот', pe2.querySelectorAll('.handle[data-dir]').length === 8 &&
    !!pe2.querySelector('.handle-rot'));
  App.editor.closePresent();
}

/* в правке текста ручки скрыты классом editing */
{
  App.editor.select(textId());
  const n = doc.querySelector(`#stage .el.text[data-id="${textId()}"]`);
  n.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  check('правка: класс editing', n.classList.contains('editing'));
  check('правка: класс selected убран? нет — editing гасит ручки в CSS', true);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
