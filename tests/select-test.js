/* Выделение элемента кликом, рамка выделения */
const { check, finish, makeDom, root } = require('./helpers');
const fs = require('fs');
const path = require('path');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);

const elOf = sel => doc.querySelector('#stage ' + sel);
const txt = elOf('.el.text');
const id = txt.dataset.id;

/* 1. клик — выделение + рамка */
txt.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
check('pointerdown выделил элемент', App.state.ui.selected === id);
check('рамка: класс .selected на узле', elOf('.el.text').classList.contains('selected'));

/* 2. рамка описана CSS в обеих темах */
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
check('рамка: базовое правило .el.selected outline', /\.el\.selected\s*\{[^}]*outline/.test(css) ||
  /\.el\.selected \{/.test(css));
check('рамка: тема neon — outline', /data-theme="neon"\]\s*\.el\.selected\s*\{[^}]*outline/.test(css));
check('рамка: тема glass — outline', /data-theme="glass"\]\s*\.el\.selected\s*\{[^}]*outline/.test(css));
check('ручки видны только у выделенного', /\.el\.selected \.handle/.test(css));

/* 3. клик по другому элементу — переключение */
const img = elOf('.el.image');
if (img) {
  const idImg = img.dataset.id;
  img.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 2 }));
  check('клик по другому: выбран он', App.state.ui.selected === idImg);
  check('старый узел потерял рамку', !elOf('.el.text').classList.contains('selected'));
  check('новый узел получил рамку', elOf('.el.image').classList.contains('selected'));
} else check('изображение есть', false);

/* 4. клик по фону — снятие */
const vp = doc.querySelector('#stageViewport');
vp.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: 40, clientY: 40 }));
window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: 41, clientY: 40 }));
check('клик по фону снял выделение', App.state.ui.selected === null);

/* 5. Esc */
txt.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 4 }));
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
check('Esc снял выделение', App.state.ui.selected === null);

/* 6. dblclick → правка; клик в другой элемент коммитит */
txt.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 5 }));
txt.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
const node = doc.querySelector('#stage .el.text');
check('dblclick: режим правки', App.state.ui.editingId === id &&
  node.getAttribute('contenteditable') === 'true');
node.textContent = 'Новый заголовок';
if (img) {
  img.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 6 }));
  const e = App.slideOf().elements.find(x => x.id === id);
  check('клик в другой элемент закоммитил текст', e.props.text === 'Новый заголовок');
  check('правка завершена', App.state.ui.editingId === null);
  check('выделение переключилось', App.state.ui.selected === img.dataset.id);
}

/* 7. рамка держится во время drag */
if (img) {
  const iid = img.dataset.id;
  img.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 200, clientY: 200 }));
  img.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 250, clientY: 230 }));
  check('рамка на месте во время drag', App.state.ui.selected === iid &&
    doc.querySelector('#stage .el.image').classList.contains('selected'));
  img.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 250, clientY: 230 }));
}

/* 8. невалидный id → null */
App.editor.select('no-such-id');
check('select(несуществующий) → null', App.state.ui.selected === null);

/* 9. навигация снимает выделение */
App.editor.select(id);
App.editor.gotoSlide(1);
check('переход на слайд снимает выделение', App.state.ui.selected === null);
App.editor.gotoSlide(0);

/* 10. презентация: view не выделяет, presentEdit выделяет */
App.editor.openPresent();
const elView = doc.querySelector('#presentStage .el.text');
elView.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 8 }));
check('view: клик не выделяет', App.state.ui.selected === null);
App.editor.togglePresentEdit();
const elPe = doc.querySelector('#presentStage .el.text');
elPe.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 9 }));
check('presentEdit: клик выделяет', App.state.ui.selected !== null &&
  doc.querySelector('#presentStage .el.selected') !== null);
App.editor.closePresent();

check('нет ошибок после сценариев', errs.length === 0);
finish();
