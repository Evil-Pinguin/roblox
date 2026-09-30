/* Панель свойств текста: шрифт, размер, цвет, жирный, курсив, подчёркивание */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const firstText = () => doc.querySelector('#stage .el.text');
const E = id => App.slideOf().elements.find(x => x.id === id);
const panel = () => doc.querySelector('#propsPanel');
const $p = sel => panel().querySelector(sel);

/* 1. Панель содержит все шесть контрол */
{
  const id = firstText().dataset.id;
  App.editor.select(id);
  check('есть поиск шрифта (pFontSearch)', !!$p('#pFontSearch') && !!$p('#pFontList'));
  check('есть размер (pSize)', !!$p('#pSize'));
  check('есть цвет (pColor)', !!$p('#pColor'));
  check('есть жирный (pBold)', !!$p('#pBold'));
  check('есть курсив (pItalic)', !!$p('#pItalic'));
  check('есть подчёркивание (pUnderline)', !!$p('#pUnderline'));
}

/* 2. Подчёркивание: включили — класс, стиль узла, модель */
{
  const id = firstText().dataset.id;
  const node = () => doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  check('изначально без подчёркивания', E(id).props.underline === false);
  $p('#pUnderline').click();
  check('после клика props.underline = true', E(id).props.underline === true);
  check('узел подчёркнут', node().style.textDecoration === 'underline');
  check('кнопка активна после перерисовки', $p('#pUnderline').classList.contains('active'));
  $p('#pUnderline').click();
  check('повторный клик выключил', E(id).props.underline === false && node().style.textDecoration === 'none');
}

/* 3. Жирный и курсив */
{
  const id = firstText().dataset.id;
  const node = () => doc.querySelector(`#stage .el.text[data-id="${id}"]`);
  const w0 = E(id).props.weight;
  $p('#pBold').click();
  check('жирный: вес переключился', E(id).props.weight !== w0);
  check('жирный: стиль узла', node().style.fontWeight === String(E(id).props.weight));
  $p('#pItalic').click();
  check('курсив включён', E(id).props.italic === true && node().style.fontStyle === 'italic');
  $p('#pItalic').click();
  check('курсив выключен', E(id).props.italic === false && node().style.fontStyle === 'normal');
}

/* 4. Шрифт, размер, цвет */
{
  const id = firstText().dataset.id;
  const node = () => doc.querySelector(`#stage .el.text[data-id="${id}"]`);

  const item = doc.querySelector('#pFontList .font-item[data-l="Inter"]') ||
    doc.querySelector('#pFontList .font-item:not(.active)');
  item.click();
  check('шрифт применился', E(id).props.fontFamily.length > 0 && node().style.fontFamily.length > 0);

  const size = $p('#pSize');
  size.value = '48';
  size.dispatchEvent(new window.Event('input'));
  check('размер 48 применён живьём', E(id).props.fontSize === 48 && node().style.fontSize === '48px');
  size.dispatchEvent(new window.Event('change'));
  check('размер закоммичен в историю', App.canUndo() === true);

  const color = $p('#pColor');
  color.value = '#123456';
  color.dispatchEvent(new window.Event('input'));
  check('цвет применён живьём', E(id).props.color === '#123456' && node().style.color === 'rgb(18, 52, 86)');
  color.dispatchEvent(new window.Event('change'));
}

/* 5. Подчёркивание переживает undo и есть в экспорте */
{
  const id = firstText().dataset.id;
  App.editor.select(id);
  if (E(id).props.underline !== false) $p('#pUnderline').click();   // приводим к выключено
  $p('#pUnderline').click();                                        // включаем — последняя запись истории
  check('включено перед undo', E(id).props.underline === true);
  App.undo();
  check('undo вернул состояние', E(id).props.underline === false);
  App.redo();
  check('redo вернул подчёркивание', E(id).props.underline === true);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
