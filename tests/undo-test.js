/* Undo/Redo через стек снимков + автосохранение */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

/* 1. старое состояние истории */
check('canUndo=false на старте', App.canUndo() === false);
check('canRedo=false на старте', App.canRedo() === false);
{
  const id = App.slideOf().elements[0].id;
  App.editor.select(id);
  check('select не создаёт запись истории', App.canUndo() === false);
}

/* 2. CRUD-жест */
{
  App.editor.addBlock();
  check('элемент добавлен', App.slideOf().elements.length === 6);
  check('после изменения canUndo=true', App.canUndo() === true);
  App.undo();
  check('undo убирает блок', App.slideOf().elements.length === 5);
  check('после undo canRedo=true', App.canRedo() === true);
  App.redo();
  check('redo возвращает блок', App.slideOf().elements.length === 6);
  App.undo();
  App.undo();
  check('второй undo — пусто', App.canUndo() === false && App.slideOf().elements.length === 5);
}

/* 3. nudge стрелкой — живой жест, одна запись (объекты читаем заново) */
{
  const id = App.slideOf().elements[0].id;
  const X = () => App.slideOf().elements.find(x => x.id === id).x;
  App.editor.select(id);
  const x0 = X();
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  check('nudge изменил x', X() === x0 + 4);
  App.undo();
  check('undo nudge: x восстановлен', X() === x0);
  App.redo();
  check('redo nudge: x снова +4', X() === x0 + 4);
  App.undo();
}

/* 4. drag — одна запись */
{
  const el = doc.querySelector('#stage .el.text');
  const id = el.dataset.id;
  const X = () => App.slideOf().elements.find(x => x.id === id).x;
  const x0 = X();
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 160, clientY: 120 }));
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 160, clientY: 120 }));
  check('drag изменил позицию', X() !== x0);
  App.undo();
  check('undo drag: позиция восстановлена', X() === x0);
  App.redo();
  check('redo drag', X() !== x0);
  App.undo();
}

/* 5. правка текста */
{
  const el = doc.querySelector('#stage .el.text');
  const id = el.dataset.id;
  const TXT = () => App.slideOf().elements.find(x => x.id === id).props.text;
  const t0 = TXT();
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 2 }));
  el.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  const node = doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  node.textContent = 'Совсем другой текст';
  node.dispatchEvent(new window.FocusEvent('blur'));
  check('commit текста в модели', TXT() === 'Совсем другой текст');
  App.undo();
  check('undo правки: исходный текст', TXT() === t0);
  App.redo();
  check('redo правки', TXT() === 'Совсем другой текст');
  App.undo();
}

/* 6. навигация не чистит redo */
{
  App.editor.addBlock();                    // шаг вперёд
  App.undo();                               // redo готов
  const ready = App.canRedo();
  App.editor.gotoSlide(1);
  check('gotoSlide не очистил redo', ready && App.canRedo());
  App.redo();
  check('redo после навигации работает', App.slideOf().elements.length === 6);
  App.undo();
  check('итог: 5 элементов', App.slideOf().elements.length === 5);
}

/* 7. клавиатура: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z */
{
  App.editor.addBlock();
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
  check('Ctrl+Z отменил добавление', App.slideOf().elements.length === 5);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));
  check('Ctrl+Y повторил', App.slideOf().elements.length === 6);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
  check('Ctrl+Z снова отменил', App.slideOf().elements.length === 5);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }));
  check('Ctrl+Shift+Z повторяет', App.slideOf().elements.length === 6);
  App.undo();
  check('очистка: 5 элементов', App.slideOf().elements.length === 5);
}

/* 8. в поле ввода — нативный undo */
{
  App.editor.select(App.slideOf().elements[0].id);
  const ta = doc.querySelector('#propsPanel #pText');
  check('textarea свойств есть', !!ta);
  if (ta) {
    const before = App.slideOf().elements[0].x;
    ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    check('Ctrl+Z в поле не трогает историю', App.canUndo() === false);
    check('Ctrl+Z в поле не меняет проект', App.slideOf().elements[0].x === before);
  }
}

/* 9. новый шаг очищает redo */
{
  App.editor.addBlock();
  App.undo();
  check('redo готов', App.canRedo());
  App.editor.addBlock();
  check('новый шаг очищает redo', App.canRedo() === false);
  App.undo();
}

/* 10. flush на beforeunload + перезагрузка */
{
  const ci = App.state.ui.current;
  App.setState(() => { App.slideOf().elements[0].x = 777; });
  window.dispatchEvent(new window.Event('beforeunload'));
  const raw = window.localStorage.getItem('rblx-pres-v2');
  check('beforeunload: сохранено немедленно',
    !!raw && JSON.parse(raw).project.slides[ci].elements[0].x === 777);

  App.undo();
  const model = App.slideOf().elements[0].x;
  window.dispatchEvent(new window.Event('beforeunload'));
  const raw2 = window.localStorage.getItem('rblx-pres-v2');
  const x = JSON.parse(raw2).project.slides[ci].elements[0].x;
  check('undo сохранён в localStorage', x === model && x !== 777);

  const boot = makeDom({ 'rblx-pres-v2': raw2 });
  check('перезагрузка: проект восстановлен', boot.errs.length === 0 &&
    boot.window.App.state.project.slides[ci].elements[0].x === x);
}

/* 11. лимит 50 */
{
  for (let i = 0; i < 60; i++) App.setState(() => { App.slideOf().elements[0].x = 100 + i; });
  let n = 0;
  while (App.canUndo()) { App.undo(); n++; }
  check('история ограничена 50 записями', n <= 50 && n >= 49);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
