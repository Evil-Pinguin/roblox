/* Этап 4.27–28: фон слайда (цвет/градиент/картинка) и форматы 16:9/4:3/1:1/9:16 */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new window.Event(type));
const stageVp = () => doc.querySelector('#stageViewport');
const thumb0 = () => doc.querySelectorAll('#slidesList .thumb')[0];

App.editor.select(null);

/* ---------- 28. Формат слайда ---------- */
{
  check('сегмент формата есть', !!$p('#sizeSeg'));
  check('4 формата', doc.querySelectorAll('#propsPanel [data-size]').length === 4);
  check('стартовый 16:9 активен', $p('[data-size="16:9"]').classList.contains('active'));
  check('размер по умолчанию 1280×720', App.state.project.width === 1280 && App.state.project.height === 720);

  const el0 = App.state.project.slides[0].elements[0]; // «Регистрация в Roblox» x=60 y=46
  const undoBefore = App.canUndo();
  $p('[data-size="4:3"]').click();
  check('4:3 → 1280×960', App.state.project.width === 1280 && App.state.project.height === 960);
  check('элементы проскалированы по Y', el0.y === Math.round(46 * 960 / 720));
  check('элементы не тронуты по X (sx=1)', el0.x === 60);
  check('активная кнопка обновилась', $p('[data-size="4:3"]').classList.contains('active') &&
    !$p('[data-size="16:9"]').classList.contains('active'));
  check('формат через setState (undo)', App.canUndo() !== undoBefore);
  check('миниатюра взяла новый aspect', thumb0().style.aspectRatio.replace(/\s/g, '') === '1280/960');
  check('thumb-inner перестроен', doc.querySelector('#slidesList .thumb-inner').style.height === '960px');
  check('сцена перестроена', /^\d+px$/.test(stageVp().style.height));

  $p('[data-size="1:1"]').click();
  check('1:1 → 1000×1000', App.state.project.width === 1000 && App.state.project.height === 1000);

  $p('[data-size="9:16"]').click();
  check('9:16 → 720×1280', App.state.project.width === 720 && App.state.project.height === 1280);
  check('миниатюра 9:16', thumb0().style.aspectRatio.replace(/\s/g, '') === '720/1280');

  App.undo(); App.undo(); App.undo();
  check('undo×3 вернул 16:9', App.state.project.width === 1280 && App.state.project.height === 720 &&
    App.state.project.slides[0].elements[0].y === 46);
}

/* ---------- 27. Фон: вкладки ---------- */
{
  check('вкладки фона', doc.querySelectorAll('#propsPanel [data-bgt]').length === 3);
  check('по умолчанию градиент', $p('[data-bgt="grad"]').classList.contains('active'));
  check('пресеты градиентов', doc.querySelectorAll('#bgSwatches .swatch').length === 8);

  /* цвет */
  $p('[data-bgt="color"]').click();
  check('цвет: свотчи + пипетка', doc.querySelectorAll('#bgColorSw .swatch').length === 8 && !!$p('#bgColorPick'));
  $p('#bgColorSw .swatch[data-c="#0a84ff"]').click();
  check('цвет в модели', App.slideOf().bg === '#0a84ff');
  check('цвет на сцене', stageVp().style.backgroundColor.replace(/\s/g, '') === 'rgb(10,132,255)' ||
    stageVp().style.backgroundColor === '#0a84ff');
  check('цвет в миниатюре', thumb0().style.backgroundColor.replace(/\s/g, '') === 'rgb(10,132,255)' ||
    thumb0().style.backgroundColor === '#0a84ff');
  check('свотч активен', $p('#bgColorSw .swatch[data-c="#0a84ff"]').classList.contains('active'));

  const pick = $p('#bgColorPick');
  pick.value = '#ffd166';
  fire(pick, 'change');
  check('пипетка применяет свой цвет', App.slideOf().bg === '#ffd166');

  /* градиент */
  $p('[data-bgt="grad"]').click();
  const g1 = $p('#bgSwatches .swatch[data-i="1"]');
  g1.click();
  check('градиент в модели', App.slideOf().bg.includes('linear-gradient'));
  check('градиент на сцене', stageVp().style.backgroundImage.includes('linear-gradient'));
  check('активный пресет', $p('#bgSwatches .swatch[data-i="1"]').classList.contains('active'));

  /* картинка: без файлового ввода — напрямую через setState */
  App.setState(() => { App.slideOf().bgImage = 'data:image/png;base64,QUJD'; });
  $p('[data-bgt="pic"]').click();
  check('превью картинки в панели', !!$p('.bg-pic-preview'));
  check('кнопка «убрать» появилась', !!$p('#bgPicClear'));
  const css = App.render.slideBgCss(App.slideOf());
  check('slideBgCss: url поверх градиента', css.startsWith('url("data:image/png;base64,QUJD")') &&
    css.includes('linear-gradient'));
  check('сцена несёт картинку+градиент', stageVp().style.backgroundImage.includes('url(') &&
    stageVp().style.backgroundImage.includes('linear-gradient'));
  check('миниатюра несёт картинку+градиент', thumb0().style.backgroundImage.includes('url('));

  $p('#bgPicClear').click();
  check('картинка убрана', App.slideOf().bgImage === '');
  check('после удаления — hint вместо превью', !!$p('.bg-pic-hint') && !$p('.bg-pic-preview'));
  check('остался градиент', App.render.slideBgCss(App.slideOf()).includes('linear-gradient'));

  /* цвет+картинка вместе */
  App.setState(() => { App.slideOf().bgImage = 'data:image/png;base64,WFpa'; });
  check('url + пусто корректно', App.render.slideBgCss(App.slideOf()).startsWith('url('));
  App.setState(() => { App.slideOf().bgImage = ''; });
}

/* ---------- нормализация старых сейвов ---------- */
{
  const pr = App.migrateProject({
    version: 2,
    slides: [{ id: 's1', bg: '#101020', elements: [
      { id: 'e1', type: 'text', x: 0, y: 0, w: 100, h: 40, props: { text: 'a' } },
    ] }],
  });
  check('миграция: есть width/height', pr.width === 1280 && pr.height === 720);
  check('миграция: bgImage пустой', pr.slides[0].bgImage === '');
  check('миграция: bg сохранён', pr.slides[0].bg === '#101020');
  const pr2 = App.migrateProject({
    version: 2, width: 720, height: 1280,
    slides: [{ id: 's1', bg: '', elements: [
      { id: 'e1', type: 'text', x: 0, y: 0, w: 100, h: 40, props: { text: 'a' } },
    ] }],
  });
  check('миграция: свой размер сохранён', pr2.width === 720 && pr2.height === 1280);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
