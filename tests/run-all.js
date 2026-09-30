/* Прогон всех suites: node tests/run-all.js */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// jsdom не переживает очистку node_modules — восстанавливаем на лету
try {
  require('jsdom');
} catch (e) {
  console.log('jsdom не найден → npm install…');
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: path.join(__dirname, '..'), stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(1);
}

const suites = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('-test.js') || f === 'smoke.js')
  .sort();

let bad = 0;
for (const s of suites) {
  const r = spawnSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8' });
  const tail = (r.stdout || '').trim().split('\n').filter(Boolean).slice(-1)[0] || '';
  console.log(`${r.status === 0 ? 'OK  ' : 'FAIL'} ${s.padEnd(22)} ${tail}`);
  if (r.status !== 0) {
    bad++;
    console.log((r.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n'));
    if (r.stderr) console.log(r.stderr.split('\n').slice(0, 6).join('\n'));
  }
}
console.log(bad ? `\nУпавших suites: ${bad}` : '\nВсе suites зелёные');
process.exit(bad ? 1 : 0);
