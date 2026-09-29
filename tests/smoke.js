/* Дымовой тест: загрузка, структура, CRUD, темы, презентация */
const { check, finish, makeDom } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
check('2 слайда по умолчанию', App.state.project.slides.length === 2);
check('слайд 1 — «Регистрация в Roblox»',
  App.state.project.slides[0].elements.some(e => e.props.text && e.props.text.includes('Регистрация')));
check('слайд 2 — Roblox Studio', App.state.project.slides[1].elements.some(e =>
  (e.props.text || '').toLowerCase().includes('studio')));

check('миниатюры отрисованы', doc.querySelectorAll('#slidesList .thumb').length === 2);
check('элементы на сцене', doc.querySelectorAll('#stage .el').length ===
  App.slideOf().elements.length);

/* CRUD */
{
  const n0 = App.slideOf().elements.length;
  App.editor.addText();
  check('addText', App.slideOf().elements.length === n0 + 1);
  App.editor.addBlock();
  check('addBlock', App.slideOf().elements.length === n0 + 2);
  App.undo(); App.undo();
  check('undo возвращает состав', App.slideOf().elements.length === n0);
}

/* темы */
{
  App.setState(() => { App.state.project.theme = 'glass'; });
  check('тема glass на body', doc.body.dataset.theme === 'glass');
  App.setState(() => { App.state.project.theme = 'neon'; });
  check('тема neon на body', doc.body.dataset.theme === 'neon');
}

/* выделение */
{
  const el = doc.querySelector('#stage .el');
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
  check('элемент выделен', App.state.ui.selected !== null &&
    doc.querySelector('#stage .el.selected') !== null);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc снимает выделение', App.state.ui.selected === null);
}

/* презентация */
{
  App.editor.openPresent();
  check('презентация открыта', App.state.ui.present === true);
  check('элементы в презентации есть',
    doc.querySelectorAll('#presentStage .el').length > 0);
  App.editor.closePresent();
  check('презентация закрыта', App.state.ui.present === false);
}

/* панель свойств при выделении */
{
  App.editor.select(App.slideOf().elements[0].id);
  check('панель свойств построена', !!doc.querySelector('#propsPanel #pText') ||
    !!doc.querySelector('#propsPanel'));
}

check('нет ошибок в конце', errs.length === 0);
finish();
