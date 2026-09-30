/* Этап 2.15–17: интервалы, Google Fonts с поиском, тень/обводка/градиент */
const { check, finish, makeDom, setStageScale, root } = require('./helpers');
const fs = require('fs');
const path = require('path');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);
setStageScale(window, 1);

const firstText = () => doc.querySelector('#stage .el.text');
const E = id => App.slideOf().elements.find(x => x.id === id);
const node = id => doc.querySelector(`#stage .el.text[data-id="${id}"]`);
const $p = sel => doc.querySelector('#propsPanel').querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new window.Event(type));

/* ---------- 15. Выравнивание, межстрочный, межбуквенный ---------- */
{
  const id = firstText().dataset.id;
  App.editor.select(id);
  check('15: контрол выравнивания (3 кнопки)', doc.querySelectorAll('#propsPanel [data-al]').length === 3);
  check('15: слайдер межстрочного (pLineH)', !!$p('#pLineH'));
  check('15: слайдер межбуквенного (pLetterS)', !!$p('#pLetterS'));

  const lh = $p('#pLineH');
  lh.value = '1.8'; fire(lh, 'input');
  check('15: line-height 1.8 в модели', E(id).props.lineHeight === 1.8);
  check('15: line-height на узле', node(id).style.lineHeight === '1.8');
  fire(lh, 'change');
  check('15: коммит в историю', App.canUndo() === true);

  const ls = $p('#pLetterS');
  ls.value = '2'; fire(ls, 'input');
  check('15: letter-spacing 2 в модели', E(id).props.letterSpacing === 2);
  check('15: letter-spacing на узле', node(id).style.letterSpacing === '2px');

  doc.querySelector('#propsPanel [data-al="center"]').click();
  check('15: выравнивание по центру', E(id).props.align === 'center' && node(id).style.textAlign === 'center');
}

/* ---------- 16. Google Fonts + поиск ---------- */
{
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  check('16: подключён fonts.googleapis.com/css2', /fonts\.googleapis\.com\/css2\?[^"]+/.test(html));
  check('16: preconnect к gstatic', /fonts\.gstatic\.com/.test(html));

  const id = firstText().dataset.id;
  App.editor.select(id);
  check('16: вместо select — поле поиска', !!$p('#pFontSearch') && !$p('#pFont'));
  check('16: есть список шрифтов', !!$p('#pFontList'));
  const items = doc.querySelectorAll('#pFontList .font-item');
  check('16: не меньше 24 гарнитур', items.length >= 24);

  const search = $p('#pFontSearch');
  search.value = 'cave'; fire(search, 'input');
  const visible = [...doc.querySelectorAll('#pFontList .font-item')]
    .filter(it => it.style.display !== 'none');
  check('16: поиск "cave" → один Caveat', visible.length === 1 && visible[0].dataset.l === 'Caveat');

  search.value = 'zzzz'; fire(search, 'input');
  const vis2 = [...doc.querySelectorAll('#pFontList .font-item')].filter(it => it.style.display !== 'none');
  check('16: пустой результат + подсказка', vis2.length === 0 && !!doc.querySelector('#pFontList .font-empty'));

  search.value = ''; fire(search, 'input');
  const caveat = [...doc.querySelectorAll('#pFontList .font-item')].find(it => it.dataset.l === 'Caveat');
  caveat.click();
  check('16: выбран Caveat', E(id).props.fontFamily === '"Caveat", cursive');
  check('16: гарнитура на узле', node(id).style.fontFamily.includes('Caveat'));
  check('16: активный пункт подсвечен', doc.querySelector('#pFontList .font-item.active').dataset.l === 'Caveat');
}

/* ---------- 17. Тень, обводка, градиент ---------- */
{
  const id = firstText().dataset.id;
  App.editor.select(id);

  /* тень */
  check('17: тень по умолчанию выключена', E(id).props.shadowOn === false && node(id).style.textShadow === 'none');
  $p('#pShadow').click();
  check('17: тень включена', E(id).props.shadowOn === true);
  check('17: text-shadow на узле', node(id).style.textShadow !== 'none');
  const blur = $p('#pShadowBlur');
  blur.value = '20'; fire(blur, 'input');
  check('17: размытие 20 в тексте тени', node(id).style.textShadow.includes('20px'));
  fire(blur, 'change');
  const sx = $p('#pShadowX');
  sx.value = '8'; fire(sx, 'input');
  check('17: смещение X=8', node(id).style.textShadow.startsWith('8px'));
  $p('#pShadow').click();
  check('17: тень выключена', E(id).props.shadowOn === false && node(id).style.textShadow === 'none');

  /* обводка */
  const sw = $p('#pStrokeW');
  sw.value = '3'; fire(sw, 'input');
  check('17: обводка 3px в модели', E(id).props.strokeWidth === 3);
  check('17: -webkit-text-stroke на узле', node(id).style.getPropertyValue('-webkit-text-stroke') === '3px #000000');
  const sc = $p('#pStrokeColor');
  sc.value = '#ff0000'; fire(sc, 'input'); fire(sc, 'change');
  check('17: цвет обводки применён', node(id).style.getPropertyValue('-webkit-text-stroke') === '3px #ff0000');
  sw.value = '0'; fire(sw, 'input');
  check('17: обводка 0 = выкл', node(id).style.getPropertyValue('-webkit-text-stroke') === 'none');

  /* градиент */
  check('17: градиент по умолчанию выключен', E(id).props.gradOn === false);
  $p('#pGrad').click();
  check('17: градиент включён', E(id).props.gradOn === true);
  check('17: gradient на узле', node(id).style.backgroundImage.startsWith('linear-gradient('));
  check('17: текст прозрачный (заливка градиентом)', node(id).style.color === 'transparent');
  check('17: background-clip: text', node(id).style.getPropertyValue('background-clip') === 'text');
  const ang = $p('#pGradAngle');
  ang.value = '45'; fire(ang, 'input');
  check('17: угол 45deg', node(id).style.backgroundImage.includes('45deg'));
  const c1 = $p('#pGradC1');
  c1.value = '#112233'; fire(c1, 'input');
  check('17: первый цвет градиента', node(id).style.backgroundImage.includes('#112233'));

  /* всё вместе — один рендер */
  $p('#pShadow').click();
  const sw2 = $p('#pStrokeW');
  sw2.value = '2'; fire(sw2, 'input'); fire(sw2, 'change');
  check('17: тень+градиент+обводка вместе',
    node(id).style.textShadow !== 'none' &&
    node(id).style.backgroundImage.startsWith('linear-gradient(') &&
    node(id).style.getPropertyValue('-webkit-text-stroke') === '2px #ff0000');

  /* undo градиента */
  const gradOff = $p('#pGrad');
  gradOff.click();          // выключить
  $p('#pGrad').click();     // включить снова — последняя запись
  App.undo();
  check('17: undo выключил градиент', E(id).props.gradOn === false);
  App.redo();
  check('17: redo включил обратно', E(id).props.gradOn === true);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
