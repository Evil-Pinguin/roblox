/* Этап: масштаб холста — зум колесом мыши и кнопками +/− */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App, R = App.render;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);
R.fitStage();

const $z = sel => doc.querySelector('#zoomBar').querySelector(sel);
const val = () => doc.querySelector('#zoomVal').textContent;
const vpW = () => parseFloat(doc.querySelector('#stageViewport').style.width);

/* ---------- панель зума ---------- */
check('панель зума на месте', !!doc.querySelector('#zoomBar'));
check('кнопки − / % / ＋', !!$z('[data-zoom="out"]') && !!$z('[data-zoom="fit"]') && !!$z('[data-zoom="in"]'));
check('старт 100% = вписать', val() === '100%' && App.state.ui.zoom === 1);
const w0 = vpW();
check('базовая ширина сцены > 0', w0 > 0);

/* ---------- кнопка ＋ ---------- */
{
  const undoBefore = App.canUndo();
  $z('[data-zoom="in"]').click();
  check('＋: zoom 1.1', App.state.ui.zoom === 1.1);
  check('＋: подпись 110%', val() === '110%');
  check('＋: холст вырос', vpW() > w0);
  check('＋: ui.scale пересчитан', App.state.ui.scale > 1);
  check('＋: историю не засоряет', App.canUndo() === undoBefore);

  $z('[data-zoom="out"]').click();
  check('−: вернулось к 100%', App.state.ui.zoom === 1 && val() === '100%');
  check('−: ширина вернулась', vpW() === w0);
}

/* ---------- кнопка «вписать» ---------- */
{
  App.editor.setZoom(3);
  $z('[data-zoom="fit"]').click();
  check('вписать → 100%', App.state.ui.zoom === 1 && val() === '100%');
}

/* ---------- колесо мыши над холстом ---------- */
{
  const area = doc.querySelector('#stageArea');
  const up = new window.WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true });
  area.dispatchEvent(up);
  check('колесо вверх = зум-ин', App.state.ui.zoom > 1);
  check('колесо перехватывает скролл', up.defaultPrevented === true);
  const z1 = App.state.ui.zoom;

  const down = new window.WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true });
  area.dispatchEvent(down);
  check('колесо вниз = зум-аут', App.state.ui.zoom < z1);

  /* колесо на панели свойств не зумит */
  const z2 = App.state.ui.zoom;
  doc.querySelector('#propsPanel').dispatchEvent(new window.WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true }));
  check('вне холста зума нет', App.state.ui.zoom === z2);
}

/* ---------- пределы ---------- */
{
  App.editor.setZoom(999);
  check('кап максимума 600%', App.state.ui.zoom === 6 && val() === '600%');
  App.editor.setZoom(0);
  check('кап минимума 10%', App.state.ui.zoom === 0.1 && val() === '10%');
  App.editor.setZoom(1);
}

/* ---------- зум не участвует в undo ---------- */
{
  App.editor.setZoom(2);
  App.editor.addText();
  check('правка после зума в истории', App.canUndo() === true);
  App.undo();
  check('undo откатил правку, но не зум', App.state.ui.zoom === 2 && val() === '200%');
  App.editor.setZoom(1);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
