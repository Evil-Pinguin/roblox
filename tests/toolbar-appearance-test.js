/* Задача 2 (позиция панели действий) + Задача 3 (раздел «Внешний вид» фото) */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new window.Event(type));
const bar = doc.querySelector('#elToolbar');
const barHidden = () => bar.classList.contains('hidden');

/* --- мок layout: холст, подсказка, тулбар --- */
const AREA = { left: 200, top: 60, right: 1000, bottom: 700, width: 800, height: 640, x: 200, y: 60 };
const HINT = { left: 400, top: 670, right: 800, bottom: 690, width: 400, height: 20, x: 400, y: 670 };
let CUR = { left: 450, top: 225, right: 750, bottom: 375, width: 300, height: 150, x: 450, y: 225 };
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.id === 'stageArea') return AREA;
  if (this.classList && this.classList.contains('hint')) return HINT;
  if (this.classList && this.classList.contains('el')) return CUR;
  return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
};
Object.defineProperty(bar, 'offsetWidth', { value: 200, configurable: true });
Object.defineProperty(bar, 'offsetHeight', { value: 44, configurable: true });
const bt = () => parseInt(bar.style.top, 10);
const bl = () => parseInt(bar.style.left, 10);

/* ==================== Задача 2: позиция панели ==================== */
App.editor.addText();
const elId = App.slideOf().elements[App.slideOf().elements.length - 1].id;
App.editor.select(elId);

{
  CUR = { left: 450, top: 225, right: 750, bottom: 375, width: 300, height: 150, x: 450, y: 225 };
  App.editor.posToolbar();
  check('панель видна при выделении', !barHidden());
  check('над рамкой: top = elemTop − h − 8', bt() === 225 - 44 - 8);
  check('по центру рамки', bl() === 450 + 150 - 100);
}

{
  /* элемент у верха холста — не влезает сверху → под ним */
  CUR = { left: 450, top: 70, right: 750, bottom: 160, width: 300, height: 90, x: 450, y: 70 };
  App.editor.posToolbar();
  check('сверху не влезло — панель под рамкой', bt() === 160 + 8);
}

{
  /* элемент у нижней границы — панель не перекрывает подсказку */
  CUR = { left: 450, top: 640, right: 750, bottom: 730, width: 300, height: 90, x: 450, y: 640 };
  App.editor.posToolbar();
  check('не выходит за низ холста', bt() + 44 <= AREA.bottom - 6);
  check('не перекрывает подсказку', bt() + 44 <= HINT.top);
  check('внутри холста сверху', bt() >= AREA.top + 6);
}

{
  /* элемент у правого края — не выходит за границы холста */
  CUR = { left: 950, top: 300, right: 1000, bottom: 400, width: 100, height: 100, x: 950, y: 300 };
  App.editor.posToolbar();
  check('не выходит за правую границу холста', bl() + 200 <= AREA.right - 6);
  check('левая граница соблюдена', bl() >= AREA.left + 6);
}

{
  /* выделение снято — панель скрыта */
  App.editor.select(null);
  App.editor.posToolbar();
  check('без выделения панель скрыта', barHidden());
  App.editor.select(elId);
  check('после выделения — снова видна', !barHidden());
}

{
  /* renderAll-обёртка: после любого рендера панель позиционируется */
  bar.style.top = '0px'; bar.style.left = '0px';
  CUR = { left: 450, top: 225, right: 750, bottom: 375, width: 300, height: 150, x: 450, y: 225 };
  App.render.renderAll();
  check('renderAll пере-позиционирует панель', bt() === 225 - 52);
}

{
  /* перетаскивание: во время жеста — скрыта, после отпускания — снова */
  const n = doc.querySelector(`#stage .el[data-id="${elId}"]`);
  n.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 9, clientX: 500, clientY: 500 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientX: 560, clientY: 540 }));
  check('во время перетаскивания панель скрыта', barHidden());
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 9, clientX: 560, clientY: 540 }));
  check('после отпускания панель снова видна', !barHidden());
}

{
  /* ресайз: во время жеста — скрыта, после — снова */
  CUR = { left: 450, top: 225, right: 750, bottom: 375, width: 300, height: 150, x: 450, y: 225 };
  App.render.renderAll();
  const h = doc.querySelector(`#stage .el[data-id="${elId}"] .handle[data-dir="e"]`);
  check('ручка ресайза есть', !!h);
  h.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 10, clientX: 740, clientY: 300 }));
  window.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 10, clientX: 770, clientY: 300 }));
  check('во время ресайза панель скрыта', barHidden());
  window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 10, clientX: 770, clientY: 300 }));
  check('после ресайза панель снова видна', !barHidden());
}

/* ==================== Задача 3: раздел «Внешний вид» ==================== */
App.editor.select(null);
App.editor.addImageFromSrc('data:image/png;base64,iVBORw0KGgo=', 1.5);
const imgId = App.slideOf().elements[App.slideOf().elements.length - 1].id;
App.editor.select(imgId);

{
  const titles = Array.from(doc.querySelectorAll('#propsPanel .prop-group-title')).map(t => t.textContent);
  check('раздел «Внешний вид» рендерится', titles.includes('Внешний вид'));
  check('группа «Фильтры» объединена (нет отдельной)', !titles.includes('Фильтры'));
  check('прозрачность — слайдер', !!$p('#pOpacity'));
  check('скругление углов', !!$p('#pRadius'));
  check('яркость', !!$p('#pBright'));
  check('контраст', !!$p('#pContrast'));
  check('размытие сохранено', !!$p('#pBlur'));
  const node = () => doc.querySelector(`#stage .el[data-id="${imgId}"]`);

  /* тень: живо + undo */
  const snap0 = JSON.stringify(App.state.project);
  const sh = $p('#pShadow');
  check('слайдер тени на месте', !!sh && !!$p('#pShadowOut'));
  sh.value = '30'; fire(sh, 'input');
  check('тень в модели', App.findEl(imgId).props.shadow === 30);
  check('тень на узле', node().style.boxShadow.includes('30px'));
  fire(sh, 'change');
  App.undo();
  check('undo убирает тень', App.findEl(imgId).props.shadow === 0 && node().style.boxShadow === 'none');
  check('undo вернул проект целиком', JSON.stringify(App.state.project) === snap0);

  /* яркость/контраст после перегруппировки */
  const b = $p('#pBright');
  b.value = '130'; fire(b, 'input');
  check('яркость живо в фильтре', node().querySelector('img').style.filter.includes('brightness(130%)'));
  fire(b, 'change');
  const c = $p('#pContrast');
  c.value = '120'; fire(c, 'input'); fire(c, 'change');
  check('контраст в модели', App.findEl(imgId).props.contrast === 120);
  App.undo(); App.undo();
  check('undo откатил фильтры', App.findEl(imgId).props.brightness === 100 && App.findEl(imgId).props.contrast === 100);

  /* прозрачность */
  const op = $p('#pOpacity');
  op.value = '55'; fire(op, 'input');
  check('прозрачность живо', node().style.opacity === '0.55');
  fire(op, 'change');
  App.undo();
  check('undo откатил прозрачность', App.findEl(imgId).props.opacity === 1);

  /* сброс фильтров жив */
  $p('#pFilterReset').click();
  check('сброс фильтров работает', App.findEl(imgId).props.brightness === 100);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
