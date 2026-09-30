/* Этап 2.15 — редактирование текста двойным кликом */
const { check, finish, makeDom, setStageScale, root } = require('./helpers');
const fs = require('fs');
const path = require('path');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const firstText = () => doc.querySelector('#stage .el.text');
const E = id => App.slideOf().elements.find(x => x.id === id);
const downUp = (el, init = {}, pid = 1) => {
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: pid, ...init }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: pid, clientX: 10, clientY: 10 }));
};
/* dblclick как в браузере: down → up → dblclick */
const dbl = (el, pid = 1) => {
  downUp(el, {}, pid);
  el.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
};

/* 1. dblclick входит в правку */
{
  const n = firstText();
  const id = n.dataset.id;
  downUp(n, {}, 1);
  dbl(n, 2);
  check('dblclick: editingId установлен', App.state.ui.editingId === id);
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  check('contenteditable включён', node.getAttribute('contenteditable') === 'true');
  check('класс editing на узле', node.classList.contains('editing'));
  check('выделение осталось у элемента', App.state.ui.selected === id);
  check('тулбар скрыт во время правки', doc.querySelector('#elToolbar').classList.contains('hidden'));

  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  check('CSS: ручки скрыты в правке', /\.el\.editing \.handle/.test(css));
}

/* 2. ввод + blur коммитит в модель */
{
  const id = firstText().dataset.id;
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  node.textContent = 'Строка один\nСтрока два';
  node.dispatchEvent(new window.FocusEvent('blur'));
  check('blur: текст в модели', E(id).props.text === 'Строка один\nСтрока два');
  check('blur: правка закрыта', App.state.ui.editingId === null);
  check('blur: contenteditable снят', node.getAttribute('contenteditable') !== 'true');
  check('blur: класс editing снят', !node.classList.contains('editing'));
  check('после правки тулбар снова виден', !doc.querySelector('#elToolbar').classList.contains('hidden'));
  App.undo();
  check('undo правки вернул исходный текст', E(id).props.text.includes('Регистрация'));
}

/* 3. Escape выходит из правки с коммитом */
{
  const id = firstText().dataset.id;
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  dbl(node, 3);
  check('снова в правке', App.state.ui.editingId === id);
  node.textContent = 'После Escape';
  node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape закрыл правку', App.state.ui.editingId === null);
  check('Escape закоммитил текст', E(id).props.text === 'После Escape');
  App.undo();
}

/* 4. клавиши во время правки не утекают в шорткаты редактора */
{
  const id = firstText().dataset.id;
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  dbl(node, 4);
  const x0 = E(id).x;
  node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  check('ArrowRight в правке не двигает элемент', E(id).x === x0);
  node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  check('Delete в правке не удаляет', App.slideOf().elements.some(e => e.id === id));
  node.dispatchEvent(new window.FocusEvent('blur'));
  check('правка закрыта после blur', App.state.ui.editingId === null);
}

/* 5. клик по другому элементу коммитит и переключает выделение */
{
  const n1 = firstText();
  const id1 = n1.dataset.id;
  dbl(n1, 5);
  n1.textContent = 'Правка до перехода';
  const img = doc.querySelector('#stage .el.image');
  downUp(img, {}, 6);
  check('переход закоммитил текст', E(id1).props.text === 'Правка до перехода');
  check('правка закрыта', App.state.ui.editingId === null);
  check('выделение переключилось', App.state.ui.selected === img.dataset.id);
}

/* 6. заблокированный текст не правится */
{
  const n = firstText();
  const id = n.dataset.id;
  App.editor.select(id);
  App.editor.toggleLock();
  dbl(n, 7);
  check('заблокированный: dblclick не входит в правку', App.state.ui.editingId === null);
  App.editor.toggleLock();
}

/* 7. presentEdit: dblclick правит текст */
{
  App.editor.openPresent();
  App.editor.togglePresentEdit();
  const pe = doc.querySelector('#presentStage .el.text');
  const pid = pe.dataset.id;
  downUp(pe, {}, 8);
  pe.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  check('presentEdit: dblclick вошёл в правку', App.state.ui.editingId === pid);
  const live = doc.querySelector(`#presentStage .el.text[data-id="${pid}"]`);
  live.textContent = 'Правка в презентации';
  live.dispatchEvent(new window.FocusEvent('blur'));
  check('presentEdit: текст закоммичен', E(pid).props.text === 'Правка в презентации');
  check('presentEdit: правка закрыта', App.state.ui.editingId === null);
  App.editor.closePresent();
  App.undo();
}

/* 8. повторные dblclick не размножают обработчики */
{
  const n = firstText();
  const id = n.dataset.id;
  for (let i = 0; i < 3; i++) {
    dbl(n, 10 + i);
    if (i < 2) {
      const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
      node.dispatchEvent(new window.FocusEvent('blur'));
    }
  }
  check('после серии правок editingId один', App.state.ui.editingId === id);
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape один раз закрывает', App.state.ui.editingId === null);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
