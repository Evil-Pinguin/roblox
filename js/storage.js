/* ============================================================
   storage.js — СОХРАНЕНИЕ / ЗАГРУЗКА (localStorage)
   Формат v2: { version: 2, project: { theme, slides[] }, current }
   Миграция из v1: { theme, slides[] (плоские элементы), current }
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const STORE_KEY = 'rblx-pres-v2';
const STORE_KEY_V1 = 'rblx-pres-v1';

let saveTimer = null;
let storageOK = true;

function save() {
  storageOK = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 350);
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    const data = {
      version: 2,
      project: App.state.project,
      current: App.state.ui.current,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    if (!storageOK) {
      storageOK = true;
      if (App.render && App.render.toast) App.render.toast('Сохранено');
    }
  } catch (err) {
    storageOK = false;
    if (App.render && App.render.toast) {
      App.render.toast('Не удалось сохранить: хранилище переполнено');
    }
  }
}

/* Загрузка: v2 → v1 → демо. Возвращает true, если данные восстановлены. */
function load() {
  try {
    const rawV2 = localStorage.getItem(STORE_KEY);
    if (rawV2) {
      const data = JSON.parse(rawV2);
      const project = App.migrateProject(data.project || data);
      if (project) {
        App.state.project = project;
        App.state.ui.current = clamp(data.current || 0, project.slides.length);
        App.resetHistory();          // базовая точка истории — загруженный проект
        return true;
      }
    }

    const rawV1 = localStorage.getItem(STORE_KEY_V1);
    if (rawV1) {
      const old = JSON.parse(rawV1);
      const project = App.migrateProject(old);
      if (project) {
        App.state.project = project;
        App.state.ui.current = clamp(old.current || 0, project.slides.length);
        App.resetHistory();
        return true;
      }
    }
  } catch (err) { /* повреждённые данные — берём демо */ }
  App.resetHistory(); // проект остался дефолтный — базовая точка истории
  return false;
}

function clear() {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_KEY_V1);
  } catch (_) {}
}

/* Закрытие/сворачивание вкладки: дописать отложенное сохранение сразу,
   чтобы последние миллисекунды правок не потерялись. */
function init() {
  window.addEventListener('beforeunload', saveNow);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}

function clamp(i, len) {
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(Math.round(i), len - 1));
}

App.storage = { save, saveNow, load, clear, init, STORE_KEY, STORE_KEY_V1 };

})(window.App);
