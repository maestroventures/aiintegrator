// proofs.mjs - the one runner behind the required `proofs` check on this repository.
//
// WHY: this repository had no check that could go red, so a broken file could reach main unseen.
// Ruling dr_owner_key_off_sessions_strict_main_protect_three_repos_20261019 makes main require this check,
// up to date before merging, for admins too. So this runner must be honest and quick:
//   1. every tracked .js/.mjs/.cjs file must parse (node --check),
//   2. every tracked .json file must be valid JSON,
//   3. every tracked .py file must compile,
//   4. every inline <script> in a tracked .html file must parse (plain scripts only),
//   5. every proof listed in .github/proofs.list (one repo-relative path per line, # for comments)
//      is run from the repository root and must exit 0.
// It keeps no file list of its own: it walks `git ls-files`, so a file added tomorrow is covered.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean).filter(f => existsSync(f));
const failures = [];
let checked = 0;
const fail = (f, why) => { failures.push(f); console.log(`RED   ${f} - ${String(why).split('\n').slice(0, 4).join(' | ')}`); };

for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (['.js', '.mjs', '.cjs'].includes(ext)) {
    checked++;
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) fail(f, r.stderr);
  } else if (ext === '.json') {
    checked++;
    try { JSON.parse(readFileSync(f, 'utf8')); } catch (e) { fail(f, e.message); }
  } else if (ext === '.py') {
    checked++;
    const r = spawnSync('python3', ['-c', 'import sys;compile(open(sys.argv[1],"rb").read(),sys.argv[1],"exec")', f], { encoding: 'utf8' });
    if (r.status !== 0) fail(f, r.stderr);
  } else if (ext === '.html') {
    checked++;
    const html = readFileSync(f, 'utf8');
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m, n = 0;
    while ((m = re.exec(html))) {
      const attrs = m[1];
      const type = (/type\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1];
      if (/\bsrc\s*=/i.test(attrs) || (type && !/^(text|application)\/javascript$/i.test(type)) || !m[2].trim()) continue;
      n++;
      try { new vm.Script(m[2], { filename: `${f}#script${n}` }); } catch (e) { fail(`${f}#script${n}`, e.message); }
    }
  }
}
console.log(`syntax: ${checked} files checked`);

const listFile = '.github/proofs.list';
let ran = 0;
if (existsSync(listFile)) {
  for (const raw of readFileSync(listFile, 'utf8').split('\n')) {
    const p = raw.trim();
    if (!p || p.startsWith('#')) continue;
    ran++;
    if (!existsSync(p)) { fail(p, 'listed in proofs.list but the file does not exist'); continue; }
    const r = spawnSync(process.execPath, [p], { encoding: 'utf8', timeout: 240000, env: { ...process.env, CI: '' } });
    if (r.status !== 0) fail(p, `exit ${r.status}\n${(r.stdout || '').split('\n').slice(-3).join(' ')} ${(r.stderr || '').split('\n').slice(0, 3).join(' ')}`);
    else console.log(`green ${p}`);
  }
}
console.log(`proofs run: ${ran}`);
if (failures.length) { console.log(`\nRED: ${failures.length} failing - ${failures.join(', ')}`); process.exit(1); }
console.log('\nGREEN: every check passed');
