/* Этап 3.20–22: кадр/фильтры/маски фото + библиотека иконок и стикеров */
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const E = id => App.slideOf().elements.find(x => x.id === id);
const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new window.Event(type));
const imgNode = id => doc.querySelector(`#stage .el.image[data-id="${id}"]`);

/* фото для сценариев */
App.editor.addImageFromSrc('data:image/png;base64,iVBORw0KGgo=', 1.5);
const imgId = App.slideOf().elements[App.slideOf().elements.length - 1].id;
App.editor.select(imgId);

/* ---------- 20. Фильтры: яркость, контраст, blur ---------- */
{
  check('фильтры: контролы на месте', !!$p('#pBright') && !!$p('#pContrast') && !!$p('#pBlur'));
  const b = $p('#pBright');
  b.value = '130'; fire(b, 'input');
  check('яркость 130 в модели', E(imgId).props.brightness === 130);
  check('filter на img', imgNode(imgId).querySelector('img').style.filter.includes('brightness(130%)'));
  fire(b, 'change');
  const c = $p('#pContrast'); c.value = '120'; fire(c, 'input'); fire(c, 'change');
  const bl = $p('#pBlur'); bl.value = '4'; fire(bl, 'input');
  check('контраст+размытие в модели', E(imgId).props.contrast === 120 && E(imgId).props.blur === 4);
  check('filter собран целиком',
    imgNode(imgId).querySelector('img').style.filter === 'brightness(130%) contrast(120%) blur(4px)');
  $p('#pFilterReset').click();
  check('сброс фильтров → none', E(imgId).props.brightness === 100 && E(imgId).props.blur === 0 &&
    imgNode(imgId).querySelector('img').style.filter === 'none');
}

/* ---------- 20. Обрезка (crop) ---------- */
{
  $p('#pCropOpen').click();
  check('режим обрезки: 4 слайдера', !!$p('#pCropW') && !!$p('#pCropH') && !!$p('#pCropX') && !!$p('#pCropY'));

  const w = $p('#pCropW');
  w.value = '50'; fire(w, 'input');
  check('ширина кадра 50% → crop.w', Math.abs(E(imgId).props.crop.w - 50) < 0.01);
  check('превью img 200%', imgNode(imgId).querySelector('img').style.width === '200%');
  check('ар пересчитан (h вырос)', E(imgId).props.ar === 0.75 && E(imgId).h === Math.round(460 / 0.75));
  fire(w, 'change');

  const h = $p('#pCropH');
  h.value = '40'; fire(h, 'input');
  check('высота кадра 40% → crop.h', Math.abs(E(imgId).props.crop.h - 40) < 0.01);
  check('ар = origAr·(w/h)', Math.abs(E(imgId).props.ar - 1.5 * (50 / 40)) < 1e-9);
  fire(h, 'change');

  $p('#pCropApply').click();
  check('кадр применён', Math.abs(E(imgId).props.crop.w - 50) < 0.01 && E(imgId).props.origAr === 1.5);
  check('панель вернулась к фото', !!$p('#pCropOpen') && !$p('#pCropW'));
  check('видна кнопка сброса кадра', !!$p('#pCropReset'));

  $p('#pCropReset').click();
  check('сброс кадра → orig', E(imgId).props.crop === null && E(imgId).props.ar === 1.5 &&
    imgNode(imgId).querySelector('img').style.width === '100%');

  /* отмена: правки не остаются */
  $p('#pCropOpen').click();
  const w2 = $p('#pCropW');
  w2.value = '30'; fire(w2, 'input');
  check('живой кадр применён к превью', imgNode(imgId).querySelector('img').style.width.includes('%'));
  $p('#pCropCancel').click();
  check('отмена вернула исходное', E(imgId).props.crop === null && E(imgId).props.ar === 1.5 &&
    E(imgId).h === Math.round(460 / 1.5));
}

/* ---------- 21. Маска изображения ---------- */
{
  App.editor.select(imgId);
  check('форма: seg ▢/◯', !!$p('[data-mask="rect"]') && !!$p('[data-mask="circle"]'));
  $p('[data-mask="circle"]').click();
  check('круг: maskShape', E(imgId).props.maskShape === 'circle');
  check('круг: border-radius 50%', imgNode(imgId).style.borderRadius === '50%');
  check('скругление спрятано у круга', !$p('#pRadius'));
  $p('[data-mask="rect"]').click();
  check('rect: скругление снова есть', !!$p('#pRadius'));
  const r = $p('#pRadius');
  r.value = '18'; fire(r, 'input');
  check('скругление 18px на узле', imgNode(imgId).style.borderRadius === '18px');
}

/* ---------- 22. Библиотека: иконки ---------- */
{
  App.editor.select(null);
  check('вкладки «Иконки | Стикеры»', !!$p('[data-lib="icon"]') && !!$p('[data-lib="sticker"]'));
  const iconCells = doc.querySelectorAll('#propsPanel .lib-grid [data-icon]');
  check('не меньше 24 иконок', iconCells.length >= 24);
  $p('[data-lib="sticker"]').click();
  const stCells = doc.querySelectorAll('#propsPanel .lib-grid [data-sticker]');
  check('не меньше 20 стикеров', stCells.length >= 20);
  $p('[data-lib="icon"]').click();

  doc.querySelector('#propsPanel .lib-grid [data-icon="heart"]').click();
  const ico = App.slideOf().elements[App.slideOf().elements.length - 1];
  check('иконка добавлена', ico.type === 'icon' && ico.props.icon === 'heart');
  const iNode = () => doc.querySelector(`#stage .el.icon[data-id="${ico.id}"]`);
  check('svg в узле', !!iNode().querySelector('svg.icon-svg path'));
  check('цвет залит в svg', iNode().querySelector('svg.icon-svg').innerHTML.includes(ico.props.fill));

  /* панель иконки */
  App.editor.select(ico.id);
  check('панель иконки: своя сетка', !!$p('#pIconGrid'));
  doc.querySelector('#pIconGrid [data-icon="bolt"]').click();
  check('смена иконки в панели', E(ico.id).props.icon === 'bolt');
  check('svg перестроен', !!iNode().querySelector('svg.icon-svg polygon'));
  const col = $p('#pIconColor');
  col.value = '#ff0000'; fire(col, 'input');
  check('цвет live в svg', iNode().querySelector('svg.icon-svg').innerHTML.includes('#ff0000'));
  fire(col, 'change');
  const op = $p('#pOpacity');
  op.value = '40'; fire(op, 'input');
  check('прозрачность иконки', iNode().style.opacity === '0.4');
}

/* ---------- 22. Библиотека: стикеры ---------- */
{
  App.editor.select(null);
  $p('[data-lib="sticker"]').click();
  doc.querySelector('#propsPanel .lib-grid [data-sticker="🔥"]').click();
  const st = App.slideOf().elements[App.slideOf().elements.length - 1];
  check('стикер добавлен', st.type === 'sticker' && st.props.emoji === '🔥');
  const sNode = () => doc.querySelector(`#stage .el.sticker[data-id="${st.id}"]`);
  check('эмодзи в узле', sNode().textContent.includes('🔥'));

  App.editor.select(st.id);
  check('панель стикера: сетка и размер', !!$p('#pStickerGrid') && !!$p('#pSize'));
  doc.querySelector('#pStickerGrid [data-sticker="🚀"]').click();
  check('смена эмодзи', E(st.id).props.emoji === '🚀');
  check('эмодзи обновился на узле', sNode().textContent.includes('🚀'));
  const sz = $p('#pSize');
  sz.value = '200'; fire(sz, 'input');
  check('размер 200×200', E(st.id).w === 200 && E(st.id).h === 200);
  check('font-size = 0.85·min', sNode().style.fontSize === '170px');
  fire(sz, 'change');
}

/* ---------- нормализация старых сейвов ---------- */
{
  const pr = App.migrateProject({
    version: 2,
    slides: [{
      id: 's1', bg: '', elements: [
        { id: 'e1', type: 'image', x: 0, y: 0, w: 100, h: 100, props: { src: 'data:x', ar: 1 } },
        { id: 'e2', type: 'icon', x: 0, y: 0, w: 100, h: 100, props: { icon: 'star' } },
        { id: 'e3', type: 'sticker', x: 0, y: 0, w: 100, h: 100, props: { emoji: '😀' } },
      ],
    }],
  });
  check('миграция вернула проект', !!pr && pr.slides[0].elements.length === 3);
  const i1 = pr.slides[0].elements[0].props;
  check('старый image добирает фильтры/маску/crop', i1.brightness === 100 && i1.maskShape === 'rect' && i1.crop === null);
  check('icon без fill получает fill', pr.slides[0].elements[1].props.fill === '#eafcff');
  check('sticker без opacity получает opacity', pr.slides[0].elements[2].props.opacity === 1);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
