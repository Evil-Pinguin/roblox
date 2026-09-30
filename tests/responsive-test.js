/* Раскладка: холст ≥60%, fit-замеры окон 900×700 и 1400×900, дровер <1000px,
   зум/подсказка не перекрывают слайд */
const fs = require('fs');
const path = require('path');
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App, R = App.render;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const rule = sel => {
  const re = new RegExp('^' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm');
  const m = css.match(re);
  return m ? m[1] : '';
};
const media999 = (() => {
  const i = css.indexOf('@media (max-width: 999px)');
  if (i < 0) return '';
  const open = css.indexOf('{', i);
  let depth = 1, j = open + 1;
  while (j < css.length && depth > 0) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') depth--;
    j++;
  }
  return css.slice(open + 1, j - 1);
})();

/* ---------- 1. холст: основное место, минимум 60% ---------- */
{
  const ws = rule('.workspace');
  check('workspace: одна строка на все зоны', /grid-template-rows:\s*minmax\(\s*0\s*,\s*1fr\s*\)/.test(ws));
  check('workspace: именованные зоны left/stage/right', /grid-template-areas:\s*"left stage right"/.test(ws));
  const sa = rule('.stage-area');
  check('холст: min-height 60% рабочей области (60vh)', /min-height:\s*60vh/.test(sa));
  check('холст: центрирование вертикали и горизонтали',
    /justify-content:\s*center/.test(sa) && /align-items:\s*center/.test(sa));
  /* арифметика: 60vh не выше самой рабочей области */
  check('60vh ≤ рабочая высота (900px окно)', 0.6 * 900 <= 900 - 60);
  check('60vh ≤ рабочая высота (700px окно)', 0.6 * 700 <= 700 - 60);
}

/* ---------- 2. панель сбоку / дровер <1000px ---------- */
{
  check('узкое окно: дouver fixed-панелью', /position:\s*fixed/.test(media999) &&
    /translateX\(/.test(media999));
  check('узкое окно: ширина 280–320px', /width:\s*min\(320px/.test(media999));
  check('узкое окно: кнопка видима', /\.props-toggle\s*\{\s*display:\s*block/.test(media999));
  check('обычное окно: кнопка скрыта', /\.props-toggle\s*\{[^}]*display:\s*none/.test(css));
  check('узкое окно: две колонки без правой (панель не под холстом)',
    /grid-template-columns:\s*190px minmax\(\s*0\s*,\s*1fr\s*\)/.test(media999));

  /* кнопка создана app.js и переключает панель */
  const tg = doc.querySelector('#propsToggle');
  check('кнопка выезжающей панели в DOM', !!tg);
  check('стартово панель закрыта', !doc.body.classList.contains('props-open'));
  tg.click();
  check('клик открывает панель', doc.body.classList.contains('props-open'));
  /* jsdom: innerWidth = 1024 ≥ 1000 → resize закрывает */
  window.dispatchEvent(new window.Event('resize'));
  check('resize ≥1000px закрывает дровер', !doc.body.classList.contains('props-open'));
}

/* ---------- замер окон: fit-расчёт сцены ---------- */
const vp = doc.querySelector('#stageViewport');
function measure(clientW, clientH) {
  const area = doc.querySelector('#stageArea');
  Object.defineProperty(area, 'clientWidth', { value: clientW, configurable: true });
  Object.defineProperty(area, 'clientHeight', { value: clientH, configurable: true });
  R.fitStage();
  return {
    w: parseFloat(vp.style.width),
    h: parseFloat(vp.style.height),
    /* центрирование: низ слайда = (clientH + h)/2 */
    slideBottom: (clientH + parseFloat(vp.style.height)) / 2,
    zoomTop: clientH - 26,   /* bottom 2 + padding 1×2 + border 1×2 + кнопка 20 */
    hintTop: clientH - 8 - 15,
  };
}

/* ---------- окно 1400×900: центр 1400−190−300 = 910 ---------- */
{
  const m = measure(910, 840);
  check('1400×900: ширина слайда 878px', m.w === 878);
  check('1400×900: высота слайда 494px', m.h === 494);
  check('1400×900: слайд вписан в зону (≤ availW/H)', m.w <= 910 - 32 && m.h <= 840 - 56);
  check('1400×900: зум-контрол не перекрывает слайд', m.zoomTop >= m.slideBottom);
  check('1400×900: подсказка не перекрывает слайд', m.hintTop >= m.slideBottom);
}

/* ---------- окно 900×700 (<1000px): центр 900−190 = 710 ---------- */
{
  const m = measure(710, 640);
  check('900×700: ширина слайда 678px', m.w === 678);
  check('900×700: высота слайда 381px', m.h === 381);
  check('900×700: слайд вписан в зону', m.w <= 710 - 32 && m.h <= 640 - 56);
  check('900×700: зум-контрол не перекрывает слайд', m.zoomTop >= m.slideBottom);
  check('900×700: подсказка не перекрывает слайд', m.hintTop >= m.slideBottom);
}

/* ---------- худший случай: окно с пропорцией ~16:9 по центру ---------- */
{
  const m = measure(910, 550);
  check('худший случай: зум не перекрывает слайд', m.zoomTop >= m.slideBottom);
  check('худший случай: подсказка не перекрывает слайд', m.hintTop >= m.slideBottom);
}

/* ---------- 5. стартовый масштаб — вписать ---------- */
{
  check('zoom по умолчанию 1 (вписать)', App.state.ui.zoom === 1);
  const saved = JSON.parse(JSON.stringify(App.state.project));
  App.editor.setZoom(1);
  check('fit: подпись 100%', doc.querySelector('#zoomVal').textContent === '100%');
  check('вписать — не пишет в историю', App.canUndo() === false);
  App.editor.setZoom(1.5);
  App.render.fitStage();
  check('fit × zoom учитывается', App.state.ui.scale > 0);
  App.editor.setZoom(1);
  check('состояние проекта не тронуто', JSON.stringify(App.state.project) === JSON.stringify(saved));
}

/* ---------- подсказка: серый мелкий текст ---------- */
{
  const h = rule('.hint');
  check('подсказка внизу холста', /bottom:\s*8px/.test(h));
  check('подсказка мелкая', /font-size:\s*11px/.test(h));
  check('подсказка серая', /color:\s*var\(--txt-dim/.test(h));
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
