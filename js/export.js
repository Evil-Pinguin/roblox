/* ============================================================
   export.js — ЭКСПОРТ / ИМПОРТ / СБРОС
   Файл: { version: 2, project: { theme, slides[] } }
   Изменения — только через App.setState.
   ============================================================ */
window.App = window.App || {};
(function (App) {
'use strict';

const state = App.state;
const setState = App.setState;
const R = App.render;
const $ = R.$;
const toast = R.toast;

function exportProject() {
  App.editor.commitEdit();
  const data = JSON.stringify({ version: 2, project: state.project }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rblx-presentation.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Проект экспортирован');
}

function importProject(obj) {
  const project = App.migrateProject(obj);
  if (!project) { toast('Файл не похож на проект'); return; }
  setState(() => {
    state.project = project;
    state.ui.current = 0;
    state.ui.selected = null; state.ui.selectedIds = [];
    state.ui.editingId = null;
    state.ui.presentEdit = false;
  });
  toast('Проект загружен');
}

function resetProject() {
  if (!confirm('Сбросить всё и вернуть демо-презентацию?')) return;
  App.storage.clear();
  setState(() => {
    state.project = App.defaultProject();
    state.ui.current = 0;
    state.ui.selected = null; state.ui.selectedIds = [];
    state.ui.editingId = null;
    state.ui.presentEdit = false;
  });
  toast('Сброшено к началу');
}

function init() {
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const fileImport = document.getElementById('fileImport');
  const btnReset = document.getElementById('btnReset');

  if (btnExport) btnExport.addEventListener('click', exportProject);
  if (btnImport && fileImport) {
    btnImport.addEventListener('click', () => { fileImport.value = ''; fileImport.click(); });
    fileImport.addEventListener('change', ev => {
      const f = ev.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { importProject(JSON.parse(rd.result)); }
        catch (_) { toast('Файл не похож на проект'); }
      };
      rd.readAsText(f);
    });
  }
  if (btnReset) btnReset.addEventListener('click', resetProject);
}

App.exporter = { exportProject, importProject, resetProject, init };

})(window.App);
