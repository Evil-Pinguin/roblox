/* Этап 4.26–27: панель миниатюр слева, добавить/удалить/дублировать слайд */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const thumbs = () => doc.querySelectorAll('#slidesList .thumb');
const items = () => doc.querySelectorAll('#slidesList .slide-item');
const activeIdx = () => Array.from(thumbs()).findIndex(t => t.classList.contains('active'));
const stageTexts = () => Array.from(doc.querySelectorAll('#stage .slide-scaler .el'))
  .map(e => e.textContent).join(' | ');

/* ---------- 26. Панель миниатюр слева ---------- */
check('панель слайдов на месте', !!doc.querySelector('#slidesList') && !!doc.querySelector('#btnAddSlide'));
check('2 миниатюры из семени', items().length === 2 && thumbs().length === 2);
check('номера 1, 2', thumbs()[0].textContent.includes('1') && thumbs()[1].textContent.includes('2'));
check('активная = текущий слайд', activeIdx() === App.state.ui.current);
check('контент внутри миниатюр', doc.querySelectorAll('#slidesList .thumb .slide-scaler, #slidesList .thumb .slide-viewport').length === 2);
check('кнопки ⧉/✕ на каждой', doc.querySelectorAll('#slidesList [data-a="dup"]').length === 2 &&
  doc.querySelectorAll('#slidesList [data-a="del"]').length === 2);

/* клик по миниатюре → переход */
thumbs()[1].click();
check('клик по миниатюре переключил слайд', App.state.ui.current === 1 && activeIdx() === 1);
check('сцена показывает слайд 2', stageTexts().includes('Roblox Studio'));
check('переход сбрасывает выделение', App.state.ui.selectedIds.length === 0);
thumbs()[0].click();
check('возврат на слайд 1', App.state.ui.current === 0 && stageTexts().includes('Регистрация в Roblox'));

/* ---------- 27. Добавить слайд ---------- */
{
  const before = items().length;
  const undoBefore = App.canUndo();
  doc.querySelector('#btnAddSlide').click();
  check('кнопка «＋ Новый слайд» добавила', items().length === before + 1);
  check('активен новый (последний) слайд', App.state.ui.current === before && activeIdx() === before);
  check('на новом слайде есть заголовок', stageTexts().includes('Заголовок слайда'));
  check('добавление через setState (undo доступен)', App.canUndo() !== undoBefore);
  App.undo();
  check('undo убрал слайд', items().length === before && App.state.ui.current === 0);
  App.redo();
  check('redo вернул слайд', items().length === before + 1);
  App.undo();

  /* кнопка в панели свойств слайда */
  check('кнопка «＋ Слайд» в панели', !!$p('[data-a="slide"]'));
  $p('[data-a="slide"]').click();
  check('панель тоже добавляет', items().length === before + 1);
  App.undo();
}

/* ---------- 27. Дублировать слайд ---------- */
{
  App.editor.gotoSlide(0);
  const before = items().length;
  const elCount = App.slideOf().elements.length;

  /* кнопка ⧉ на миниатюре */
  items()[0].querySelector('[data-a="dup"]').click();
  check('⧉ на миниатюре: +1 слайд', items().length === before + 1);
  check('активна копия (после оригинала)', App.state.ui.current === 1 && activeIdx() === 1);
  const copy = App.slideOf();
  const orig = App.state.project.slides[0];
  check('копия: свой id', copy.id !== orig.id);
  check('копия: столько же элементов', copy.elements.length === elCount && elCount > 0);
  check('копия: содержимое совпадает', JSON.stringify(copy.elements.map(e => [e.type, e.x, e.y, e.text]))
    === JSON.stringify(orig.elements.map(e => [e.type, e.x, e.y, e.text])));
  check('копия: id элементов новые', copy.elements.every((e, k) => e.id !== orig.elements[k].id));
  check('нумерация обновилась', thumbs()[1].textContent.includes('2'));

  /* кнопка «⧉ Дублировать» в панели свойств */
  check('кнопка в панели', !!$p('[data-a="dup-slide"]'));
  $p('[data-a="dup-slide"]').click();
  check('панель дублирует активный слайд', items().length === before + 2);
  check('активна вторая копия', App.state.ui.current === 2);
  App.undo();
  App.undo();
  check('двойной undo вернул количество', items().length === before && App.slideOf().id === orig.id);
}

/* ---------- 27. Удалить слайд ---------- */
{
  /* размножим до 4 для сценариев */
  App.editor.addSlide(); App.editor.addSlide(); App.editor.addSlide();
  check('подготовка: 5 слайдов', items().length === 5);

  /* удаление неактивной (последней) миниатюры */
  App.editor.gotoSlide(0);
  items()[4].querySelector('[data-a="del"]').click();
  check('✕ на миниатюре: -1', items().length === 4);
  check('удаление неактивной не двигает текущий', App.state.ui.current === 0 && activeIdx() === 0);

  /* удаление активного слайда из панели */
  App.editor.gotoSlide(2);
  $p('[data-a="del-slide"]').click();
  check('«✕ Удалить» из панели: -1', items().length === 3);
  check('после удаления активного выбор корректен', App.state.ui.current === 1 && activeIdx() === 1);

  /* undo */
  App.undo();
  check('undo вернул слайд', items().length === 4 && App.state.ui.current === 2);

  /* удалить всё кроме одного — дальше нельзя */
  let guard = 0;
  while (items().length > 1 && guard++ < 10) items()[0].querySelector('[data-a="del"]').click();
  check('остался один слайд', items().length === 1);
  const before = items().length;
  const undoBefore = App.canUndo();
  items()[0].querySelector('[data-a="del"]').click();
  check('последний слайд удалить нельзя', items().length === before);
  check('защита не пишет в историю', App.canUndo() === undoBefore);

  App.undo();
  check('undo восстановил 2+ слайдов', items().length > 1);
}

/* ---------- фон слайда виден в миниатюре ---------- */
{
  App.editor.gotoSlide(0);
  const sw = doc.querySelector('#propsPanel #bgSwatches .swatch[data-i="1"]');
  check('пресеты фона в панели слайда', !!sw);
  sw.click();
  check('фон слайда применён', !!App.slideOf().bg);
  check('миниатюра несёт фон', thumbs()[App.state.ui.current].style.background !== '');
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
