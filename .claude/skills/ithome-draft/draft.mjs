#!/usr/bin/env node
// 把 dayN.md 同步到 iThome 鐵人賽草稿頁：標題、內文、圖片上傳，最後按「儲存草稿」。
// 永遠不按「發表文章」。發佈是作者的動作。
//
// 用法：
//   node .claude/skills/ithome-draft/draft.mjs --day 2 --url https://ithelp.ithome.com.tw/articles/<id>/draft
//   node .claude/skills/ithome-draft/draft.mjs --day 2                # 第二次以後，網址從 .ithome/articles.json 讀
//   node .claude/skills/ithome-draft/draft.mjs --day 2 --check-only   # 只解析文章，不開瀏覽器
//   node .claude/skills/ithome-draft/draft.mjs --day 2 --dry-run      # 開瀏覽器、確認登入與編輯器，但不上傳不填不存
//
// 需要 Node 22+（內建 fetch / WebSocket）與 macOS 上的 Google Chrome。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

// ---------- 參數 ----------
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(name);

const day = Number(opt('--day'));
if (!Number.isInteger(day) || day < 1) die('請用 --day <N> 指定天數');
const port = Number(opt('--port', 9222));
const checkOnly = flag('--check-only');
const dryRun = flag('--dry-run');
const noPreview = flag('--no-preview');

const repo = process.cwd();
const mdPath = path.join(repo, `day${day}.md`);
const statePath = path.join(repo, '.ithome', 'articles.json');
const profileDir = path.join(os.homedir(), '.cache', 'claude-chrome-profile');
const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UPLOAD_LIMIT = 5 * 1024 * 1024;

if (!fs.existsSync(mdPath)) die(`找不到 ${mdPath}`);

// ---------- 讀取狀態 ----------
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
const key = `day${day}`;
const entry = state[key] || {};
const url = opt('--url') || entry.draftUrl;
if (!checkOnly && !url) die(`第一次同步 day${day} 需要 --url <草稿網址>（作者先在 iThome 按「鐵人發文」開好草稿）`);
if (url && !/^https:\/\/ithelp\.ithome\.com\.tw\/articles\/\d+\/draft$/.test(url)) die(`網址格式不對，預期 https://ithelp.ithome.com.tw/articles/<id>/draft，拿到：${url}`);
const articleId = url ? url.match(/articles\/(\d+)/)[1] : entry.articleId;

// ---------- 解析文章 ----------
const raw = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n');
const lines = raw.split('\n');
if (!/^#\s+\S/.test(lines[0])) die('第一行必須是 "# 標題"');
const title = lines[0].replace(/^#\s+/, '').trim();
let body = lines.slice(1).join('\n');
body = body.replace(/<!--[\s\S]*?-->/g, '');      // 拿掉 HTML 註解（例如「本人撰寫，AI 勿動」標記）
body = body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';

const localImages = [...new Set([...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(p => !/^https?:\/\//.test(p)))];
for (const p of localImages) {
  const abs = path.join(repo, p);
  if (!fs.existsSync(abs)) die(`內文引用的圖片不存在：${p}`);
  const size = fs.statSync(abs).size;
  if (size > UPLOAD_LIMIT) die(`圖片超過 iThome 5MB 上限：${p}（${(size / 1024 / 1024).toFixed(1)}MB）`);
}
const images = { ...(entry.images || {}) };
const pendingUploads = localImages.filter(p => !images[p]);

log(`文章：day${day}.md`);
log(`標題：${title}`);
log(`內文：${body.length} 字元，${body.split('\n').length} 行`);
log(`圖片：${localImages.length} 張，其中 ${pendingUploads.length} 張尚未上傳${pendingUploads.length ? '：' + pendingUploads.join(', ') : ''}`);
if (url) log(`草稿：${url}`);

if (checkOnly) { log('check-only 模式，結束。'); process.exit(0); }

// ---------- Chrome / CDP ----------
const cdpBase = `http://127.0.0.1:${port}`;
async function cdpUp() { try { const r = await fetch(`${cdpBase}/json/version`, { signal: AbortSignal.timeout(2000) }); return r.ok; } catch { return false; } }

if (!(await cdpUp())) {
  if (!fs.existsSync(chromeBin)) die(`找不到 Chrome：${chromeBin}`);
  log(`沒有偵測到 CDP，啟動獨立 profile 的 Chrome（${profileDir}）...`);
  fs.mkdirSync(profileDir, { recursive: true });
  const child = spawn(chromeBin, [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { detached: true, stdio: 'ignore' });
  child.unref();
  const deadline = Date.now() + 20000;
  while (!(await cdpUp())) { if (Date.now() > deadline) die('Chrome 啟動後 20 秒內 CDP 沒有回應'); await sleep(500); }
}

let targets = await (await fetch(`${cdpBase}/json`)).json();
let target = targets.find(t => t.type === 'page' && t.url.startsWith('https://ithelp.ithome.com.tw/')) || targets.find(t => t.type === 'page' && t.url === 'about:blank');
let createdTargetId = null;
if (!target) {
  const r = await fetch(`${cdpBase}/json/new?about:blank`, { method: 'PUT' });
  target = await r.json();
  createdTargetId = target.id;   // 出錯時關掉自己開的分頁，成功時留著讓作者看
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 連不上 ' + target.webSocketDebuggerUrl)); });
let msgId = 0; const pending = new Map();
const listeners = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method) { for (const l of [...listeners]) if (l.method === m.method) { listeners.splice(listeners.indexOf(l), 1); l.res(m.params); } }
};
function waitForEvent(method, timeoutMs) {
  return new Promise((res, rej) => {
    const l = { method, res };
    listeners.push(l);
    setTimeout(() => { const i = listeners.indexOf(l); if (i >= 0) { listeners.splice(i, 1); rej(new Error('等 ' + method + ' 逾時')); } }, timeoutMs);
  });
}
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++msgId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('頁面內 JS 例外：' + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
  return r.result.value;
}
async function href() { return evaluate('location.href'); }
async function navigate(u, timeoutMs = 20000) {
  // 先掛 load 事件的 listener 再導頁，避免讀到舊頁面的 readyState
  const loaded = waitForEvent('Page.loadEventFired', timeoutMs);
  await send('Page.navigate', { url: u });
  await loaded.catch(() => {});             // 逾時就退回輪詢
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try { if (await evaluate("document.readyState === 'complete' && location.href !== 'about:blank'")) return; } catch {}
    await sleep(300);
  }
  throw new Error('導頁逾時：' + u);
}
await send('Page.enable');
await send('Page.bringToFront').catch(() => {});

// ---------- 導到草稿頁，處理登入 ----------
await navigate(url);
if ((await href()).includes('member.ithome.com.tw/login')) {
  log('被導到登入頁。請到剛才那個 Chrome 視窗登入 iThome，我在這裡等（最多 5 分鐘）...');
  const deadline = Date.now() + 5 * 60 * 1000;
  while ((await href()).includes('member.ithome.com.tw')) { if (Date.now() > deadline) die('等登入逾時'); await sleep(2000); }
  log('登入完成，重新導到草稿頁。');
  await navigate(url);
}
const now = await href();
if (now !== url) die(`頁面沒有停在草稿頁（現在在 ${now}）。已發表文章的草稿網址會被 iThome 導到別處（實測會導到文章圖片的網址），這支腳本只處理未發表的草稿。要改已發表的文章請走 iThome 的編輯頁，那條路還沒摸過 DOM。`);

const editorOk = await evaluate(`!!(document.querySelector('.CodeMirror') && document.querySelector('.CodeMirror').CodeMirror && document.querySelector('input[name=subject]') && document.querySelector('#ironmanEditForm') && document.querySelector('button.btn-draft.save-group__btn'))`);
if (!editorOk) die('草稿頁的編輯器結構跟預期不同（找不到 CodeMirror / subject / ironmanEditForm / 儲存草稿按鈕）。iThome 可能改版了，需要重新摸 DOM。');
const existing = await evaluate(`({title: document.querySelector('input[name=subject]').value, bodyLen: document.querySelector('.CodeMirror').CodeMirror.getValue().length})`);
log(`草稿頁目前：標題「${existing.title}」，內文 ${existing.bodyLen} 字元（會被覆蓋）`);

if (dryRun) { log('dry-run 模式：瀏覽器與編輯器都正常，未上傳、未填寫、未儲存。'); ws.close(); process.exit(0); }

// ---------- 上傳圖片 ----------
for (const p of pendingUploads) {
  const b64 = fs.readFileSync(path.join(repo, p)).toString('base64');
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const result = await evaluate(`(async()=>{
    const bin=atob(${JSON.stringify(b64)}); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    const token=document.querySelector('#ironmanEditForm input[name=_token]').value;
    const fd=new FormData(); fd.append('images[]', new Blob([arr],{type:${JSON.stringify(mime)}}), ${JSON.stringify(path.basename(p))}); fd.append('_token', token);
    const r=await fetch('https://ithelp.ithome.com.tw/api/upload',{method:'POST',body:fd,credentials:'include',headers:{'X-CSRF-TOKEN':token,'X-Requested-With':'XMLHttpRequest'}});
    return {status:r.status, text:(await r.text()).slice(0,500)};
  })()`);
  let parsed; try { parsed = JSON.parse(result.text); } catch {}
  if (result.status !== 200 || !parsed || parsed.status !== 'success' || !parsed.url) die(`上傳失敗：${p} → HTTP ${result.status} ${result.text}`);
  images[p] = parsed.url;
  log(`上傳：${p} → ${parsed.url}`);
  saveState({ images });   // 每張傳完就記下來，中途失敗也不會重傳
}
let finalBody = body;
for (const [local, remote] of Object.entries(images)) finalBody = finalBody.split(`(${local})`).join(`(${remote})`);
const leftover = (finalBody.match(/!\[[^\]]*\]\((?!https?:\/\/)[^)]*\)/g) || []);
if (leftover.length) die('還有沒換掉的本機圖片路徑：' + leftover.join(', '));

// ---------- 填入並儲存 ----------
const saveLoaded = waitForEvent('Page.loadEventFired', 20000);
await evaluate(`(()=>{
  const t=document.querySelector('input[name=subject]'); t.value=${JSON.stringify(title)}; t.dispatchEvent(new Event('input',{bubbles:true}));
  const cm=document.querySelector('.CodeMirror').CodeMirror; cm.setValue(${JSON.stringify(finalBody)}); cm.save();
  document.querySelector('button.btn-draft.save-group__btn').click();
})()`);
log('已按「儲存草稿」，等頁面回來...');
await saveLoaded.catch(() => {});
await sleep(500);

// ---------- 重新載入驗證 ----------
await navigate(url);
const after = await evaluate(`({title: document.querySelector('input[name=subject]').value, body: document.querySelector('.CodeMirror').CodeMirror.getValue()})`);
const norm = s => s.replace(/\r\n/g, '\n').replace(/\s+$/, '');
const problems = [];
if (after.title !== title) problems.push(`標題不一致：頁面「${after.title}」 vs 檔案「${title}」`);
if (norm(after.body) !== norm(finalBody)) problems.push(`內文不一致：頁面 ${after.body.length} 字元 vs 預期 ${finalBody.length} 字元`);
const localLeft = (after.body.match(/!\[[^\]]*\]\((?!https?:\/\/)[^)]*\)/g) || []).length;
if (localLeft) problems.push(`頁面內文仍有 ${localLeft} 個本機圖片路徑`);
if (problems.length) die('儲存後驗證失敗：\n  ' + problems.join('\n  '));
log(`驗證通過：標題一致、內文 ${after.body.length} 字元一致、${Object.keys(images).length} 張圖片皆為 iThome 網址`);

// ---------- 預覽截圖 ----------
let previewPath = null;
if (!noPreview) {
  try {
    await evaluate(`document.querySelector('.editor-toolbar a.fa-eye, .editor-toolbar .preview')?.click(); 'ok'`);
    await sleep(1500);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    previewPath = path.join(os.tmpdir(), `ithome-day${day}-preview.png`);
    fs.writeFileSync(previewPath, Buffer.from(shot.data, 'base64'));
    await evaluate(`document.querySelector('.editor-toolbar a.fa-eye, .editor-toolbar .preview')?.click(); 'ok'`);
    log(`預覽截圖：${previewPath}`);
  } catch (e) { log('預覽截圖失敗（不影響同步結果）：' + e.message); }
}

saveState({ articleId, draftUrl: url, title, images, lastSyncedAt: new Date().toISOString() });
log(`完成。紀錄已寫入 ${path.relative(repo, statePath)}。沒有發表，發表請作者自己按。`);
ws.close();
process.exit(0);

// ---------- 工具 ----------
function saveState(patch) {
  const cur = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  cur[key] = { ...(cur[key] || {}), ...patch };
  const sorted = Object.fromEntries(Object.keys(cur).sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))).map(k => [k, cur[k]]));
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(sorted, null, 2) + '\n');
}
function log(s) { console.log(s); }
function die(s) {
  console.error('錯誤：' + s);
  if (typeof createdTargetId === 'string') { try { execFileSync('curl', ['-s', `${cdpBase}/json/close/${createdTargetId}`], { stdio: 'ignore' }); } catch {} }
  process.exit(1);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
