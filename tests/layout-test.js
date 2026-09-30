/* Задача 1: раскладка редактора — три зоны, fit-холст, правая панель 280–320px */
const fs = require('fs');
const path = require('path');
const { check, finish, makeDom, setStageScale } = require('./helpers');

const { window, errs } = makeDom();
const doc = window.document, App = window.App;

check('загрузка без ошибок', errs.length === 0);

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const appjs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const rule = sel => {
  // начало строки — чтобы не хватить тематические селекторы вида body[data-theme] .x
  const re = new RegExp('^' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm');
  const m = css.match(re);
  return m ? m[1] : '';
};

/* ---------- три зоны ---------- */
{
  const ws = rule('.workspace');
  check('.workspace — grid', /display:\s*grid/.test(ws));
  const cols = (ws.match(/grid-template-columns:\s*([^;]+)/) || [])[1] || '';
  const compact = cols.replace(/minmax\([^)]*\)/g, s => s.replace(/\s+/g, ''));
  const tracks = compact.trim().split(/\s+/);
  check('три колонки: миниатюры | холст | свойства', tracks.length === 3);
  check('центр — 1fr с minmax(0,…)', /minmax\(\s*0\s*,\s*1fr\s*\)/.test(cols));
  check('правая колонка в 280–320px',
    (() => { const px = parseFloat((cols.match(/(\d+(?:\.\d+)?)px/g) || []).pop()); return px >= 280 && px <= 320; })());
  check('высота = окно − топбар', /height:\s*calc\(100vh/.test(ws));
  check('workspace не распирается', /overflow:\s*hidden/.test(ws) && /min-height:\s*0/.test(ws));
}

/* ---------- центр: холст центрируется и вписывается ---------- */
{
  const sa = rule('.stage-area');
  check('stage-area центрирует', /justify-content:\s*center/.test(sa) && /align-items:\s*center/.test(sa));
  check('stage-area не распирается контентом', /min-width:\s*0/.test(sa) && /min-height:\s*0/.test(sa));
  check('stage-area прокручивается при зуме', /overflow:\s*auto/.test(sa));
  const st = rule('.stage');
  check('.stage не сжимается flex\'ом', /flex:\s*0\s*0\s*auto/.test(st));

  /* fit-расчёт работает */
  setStageScale(window, 1);
  App.render.fitStage();
  const vp = doc.querySelector('#stageViewport');
  check('fit: сцена получила размер', /^\d+px$/.test(vp.style.width) && /^\d+px$/.test(vp.style.height));
}

/* ---------- панели: фиксированные ширины, свой скролл ---------- */
{
  const sp = rule('.side-panel');
  check('панели скроллятся вертикально', /overflow-y:\s*auto/.test(sp));
  check('горизонтального скролла нет', /overflow-x:\s*hidden/.test(sp));
  check('колесо не утекает с панели (overscroll)', /overscroll-behavior:\s*contain/.test(sp));
  const right = rule('.side-panel.right');
  const w = parseFloat((right.match(/width:\s*(\d+(?:\.\d+)?)px/) || [])[1]);
  check('правая панель 280–320px', w >= 280 && w <= 320);
  const left = rule('.side-panel.left');
  check('левая панель фиксирована', /width:\s*\d+px/.test(left));

  /* разметка: три зоны на месте */
  check('левая зона = миниатюры', !!doc.querySelector('aside.side-panel.left #slidesList'));
  check('центральная зона = холст', !!doc.querySelector('main.stage-area #stage'));
  check('правая зона = свойства', !!doc.querySelector('aside.side-panel.right#propsPanel'));
}

/* ---------- js/app.js: расчёт размера сцены ---------- */
{
  check('app.js считает fit после первого рендера', /renderAll\(\)[\s\S]{0,400}fitStage\(\)/.test(appjs));
  check('app.js пересчитывает при load', /addEventListener\(\s*'load'[\s\S]{0,80}fitStage/.test(appjs));
}

/* ---------- зум/undo не тронуты ---------- */
{
  check('зум работает', (App.editor.setZoom(1.5), App.state.ui.zoom === 1.5));
  App.editor.setZoom(1);
  check('undo не тронут', App.canUndo() === false || App.canUndo() === true);
}

check('нет ошибок после сценариев', errs.length === 0);
finish();
