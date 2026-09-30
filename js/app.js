/* ============================================================
   app.js — ТОЧКА ВХОДА
   Загрузка данных → инициализация модулей → первый рендер.
   Дальше все изменения идут только через App.setState().
   (скрипты подключены в конце <body>, DOM уже готов)
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

App.storage.load();          // v2 → v1 → демо (загрузка при старте)
App.storage.init();           // дописать сохранение при закрытии вкладки
App.editor.init();           // кнопки, темы, клавиатура, презентация, файлы
App.exporter.init();         // экспорт / импорт / сброс
App.render.renderAll();      // первый рендер (включает chrome: тема и т.д.)

/* Расчёт размера сцены: холст центрируется и вписывается (fit-масштаб)
   в свободную зону центральной колонки между панелями.
   Стартовый масштаб — «вписать» (zoom = 1), повторный пересчёт после
   load — шрифты/картинки могли изменить раскладку. */
App.render.fitStage();
window.addEventListener('load', () => App.render.fitStage());

/* Узкое окно (<1000px): кнопка выезжающей панели свойств.
   Панель лежит поверх холста справа — сам холст не сжимается. */
const stageArea = document.querySelector('.stage-area');
const propsToggle = document.createElement('button');
propsToggle.id = 'propsToggle';
propsToggle.className = 'props-toggle';
propsToggle.title = 'Панель свойств';
propsToggle.textContent = '☰ Свойства';
propsToggle.addEventListener('click', () => {
  document.body.classList.toggle('props-open');
  App.render.fitStage();               // холст пересчитывается под окно
});
if (stageArea) stageArea.appendChild(propsToggle);

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1000) document.body.classList.remove('props-open');
  App.render.fitStage();
});

})(window.App);
