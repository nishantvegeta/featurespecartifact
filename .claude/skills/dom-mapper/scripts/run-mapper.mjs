#!/usr/bin/env node
// run-mapper.mjs
// Playwright runner invoked by the dom-mapper skill.
// Reads:  { feature_path, to_map } as JSON on stdin
//         env vars MAPPER_URL / MAPPER_EMAIL / MAPPER_PASS
//         (set by the dom-mapper skill from whatever variables the user's .env actually uses)
// Writes: resolved selectors as JSON on stdout
// Side effects: opens a headed Chromium browser; user interacts with it.

import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr, exit } from 'node:process';

// ──────────────────────────────────────────────────────────────────────────
// Config from env

const DEV_URL = process.env.MAPPER_URL;
const USERNAME = process.env.MAPPER_EMAIL;
const PASSWORD = process.env.MAPPER_PASS;

if (!DEV_URL || !USERNAME || !PASSWORD) {
  stderr.write('ERROR: MAPPER_URL, MAPPER_EMAIL, MAPPER_PASS must be set in env.\n');
  stderr.write('       (These are set by the dom-mapper skill — if you are running this script directly,\n');
  stderr.write('        the skill resolves them from {tests_repo}/.env via the mapping file.)\n');
  exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Read input from stdin: { feature_path: string | null, to_map: [...] }

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const inputJson = await readStdin();
let input;
try {
  input = JSON.parse(inputJson);
} catch (e) {
  stderr.write(`ERROR: stdin must be JSON. ${e.message}\n`);
  exit(2);
}

// Backwards-compatibility: if stdin is a bare array, treat it as to_map with no feature_path.
if (Array.isArray(input)) {
  input = { feature_path: null, to_map: input };
}

const { feature_path: featurePath, to_map: toMap } = input;

if (!Array.isArray(toMap) || toMap.length === 0) {
  stderr.write('ERROR: stdin must include a non-empty `to_map` array of { tc_number, step_number, step_text, expected_result } objects.\n');
  exit(2);
}

// Resolve the post-login URL based on feature_path
const postLoginUrl = (() => {
  if (!featurePath) return null;
  if (/^https?:\/\//i.test(featurePath)) return featurePath; // absolute
  // relative — join with DEV_URL, preserving exactly one slash
  const base = DEV_URL.replace(/\/+$/, '');
  const path = featurePath.startsWith('/') ? featurePath : `/${featurePath}`;
  return `${base}${path}`;
})();

const rl = createInterface({ input: stdin, output: stderr, terminal: false });
const ask = (q) => rl.question(q);

// ──────────────────────────────────────────────────────────────────────────
// Locator preference: data-testid > id > aria-label > role+name > CSS path

async function bestLocatorFor(handle) {
  return await handle.evaluate((el) => {
    const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/(["\\\]])/g, '\\$1'));

    const testid = el.getAttribute('data-testid');
    if (testid) return { value: `[data-testid="${testid}"]`, kind: 'testid' };

    const id = el.getAttribute('id');
    if (id && /^[A-Za-z][\w-]*$/.test(id)) return { value: `#${id}`, kind: 'id' };
    if (id) return { value: `[id="${id}"]`, kind: 'id' };

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return { value: `[aria-label="${ariaLabel.replace(/"/g, '\\"')}"]`, kind: 'aria-label' };

    const role = el.getAttribute('role') || (() => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (tag === 'input') {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        if (t === 'checkbox' || t === 'radio' || t === 'submit' || t === 'button') return t;
        return 'textbox';
      }
      if (tag === 'textarea') return 'textbox';
      if (tag === 'select') return 'combobox';
      return null;
    })();
    const accName = (el.innerText || '').trim().split(/\s+/).slice(0, 8).join(' ');
    if (role && accName) return { value: `role=${role}[name="${accName.replace(/"/g, '\\"')}"]`, kind: 'role' };

    // Last resort: CSS path
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let segment = node.tagName.toLowerCase();
      const cls = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) segment += '.' + cls.map(cssEscape).join('.');
      const parent = node.parentElement;
      if (parent) {
        const sibs = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sibs.length > 1) segment += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      path.unshift(segment);
      node = node.parentElement;
    }
    return { value: path.join(' > '), kind: 'css-path' };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Heuristic suggestion based on step text keywords

const HINT_WORDS = (text) => {
  const t = text.toLowerCase();
  const out = new Set();
  // Action keywords
  ['save', 'cancel', 'close', 'search', 'reset', 'new', 'create', 'edit', 'delete', 'export', 'preview', 'view', 'history', 'attachment'].forEach((w) => {
    if (t.includes(w)) out.add(w);
  });
  // Field keywords (multi-word)
  const fieldNouns = t.match(/\b([a-z]+(?:\s+[a-z]+){0,3})\s+(?:field|input|button|icon|slot|placeholder|label|column|row|tab|section|message|toast|modal|dialog)/g) || [];
  fieldNouns.forEach((m) => out.add(m.split(/\s+/).slice(0, -1).join(' ')));
  return [...out];
};

async function heuristicSuggest(page, stepText) {
  const hints = HINT_WORDS(stepText);
  if (hints.length === 0) return null;

  const candidates = await page.evaluate((hints) => {
    const score = (el) => {
      let s = 0;
      const text = (el.innerText || '').toLowerCase().slice(0, 200);
      const attrs = [
        el.getAttribute('data-testid') || '',
        el.getAttribute('id') || '',
        el.getAttribute('aria-label') || '',
        el.getAttribute('class') || '',
        el.getAttribute('name') || '',
      ].join(' ').toLowerCase();
      for (const h of hints) {
        if (attrs.includes(h.replace(/\s+/g, '-'))) s += 5;
        if (attrs.includes(h.replace(/\s+/g, ''))) s += 4;
        if (text.includes(h)) s += 2;
      }
      // Prefer interactive elements
      const tag = el.tagName.toLowerCase();
      if (['button', 'a', 'input', 'select', 'textarea'].includes(tag)) s += 1;
      // Prefer visible
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) s -= 10;
      return s;
    };

    const all = [...document.querySelectorAll('button, a, input, select, textarea, [role], [data-testid], [id], [aria-label]')];
    const scored = all.map((el) => ({ el, s: score(el) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 1).map(({ el, s }) => {
      const idx = all.indexOf(el);
      return { idx, score: s };
    });
  }, hints);

  if (candidates.length === 0) return null;

  // Re-acquire element handle by index (evaluate-returned indices are stable within this call)
  const handle = await page.evaluateHandle((i) => {
    const all = [...document.querySelectorAll('button, a, input, select, textarea, [role], [data-testid], [id], [aria-label]')];
    return all[i];
  }, candidates[0].idx);

  const elementHandle = handle.asElement();
  if (!elementHandle) return null;

  const locator = await bestLocatorFor(elementHandle);
  return { handle: elementHandle, locator, score: candidates[0].score };
}

// ──────────────────────────────────────────────────────────────────────────
// Highlight an element with a red outline

async function highlight(page, handle) {
  await handle.evaluate((el) => {
    el.dataset._mapperPrev = el.style.outline || '';
    el.style.outline = '3px solid red';
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  });
}
async function unhighlight(page, handle) {
  await handle.evaluate((el) => {
    el.style.outline = el.dataset._mapperPrev || '';
    delete el.dataset._mapperPrev;
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Capture next click in the page; resolves with the clicked element handle

async function captureNextClick(page) {
  return new Promise((resolve) => {
    const handler = async (msg) => {
      if (msg.type() === 'log' && msg.text().startsWith('__MAPPER_CLICK__')) {
        page.off('console', handler);
        const handle = await page.evaluateHandle(() => window.__mapperLastClick);
        const el = handle.asElement();
        resolve(el);
      }
    };
    page.on('console', handler);
    page.evaluate(() => {
      window.__mapperLastClick = null;
      const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.__mapperLastClick = e.target;
        console.log('__MAPPER_CLICK__');
        document.removeEventListener('click', onClick, true);
      };
      document.addEventListener('click', onClick, true);
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Login (best effort) — only fires if a recognisable login form is on-screen

async function tryLogin(page) {
  const userField = await page.$('#username, #email, input[type=email], input[name=username], input[name=email]');
  const passField = await page.$('#password, input[type=password], input[name=password]');
  if (!userField || !passField) return false;

  await userField.fill(USERNAME);
  await passField.fill(PASSWORD);

  const submit = await page.$('#btn-login, #btn-signin, button[type=submit], input[type=submit]');
  if (submit) {
    await submit.click();
  } else {
    await passField.press('Enter');
  }
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return true;
}

// ──────────────────────────────────────────────────────────────────────────
// Main

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' });

stderr.write(`\nNavigated to ${DEV_URL}. Attempting login if a login form is present...\n`);
const loggedIn = await tryLogin(page);
stderr.write(loggedIn ? '✓ Login form detected and submitted.\n' : '— No login form detected; assuming user is already authenticated.\n');

if (postLoginUrl) {
  stderr.write(`→ Navigating to feature path: ${postLoginUrl}\n`);
  try {
    await page.goto(postLoginUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    stderr.write(`✓ Landed at ${page.url()}\n`);
    if (page.url() !== postLoginUrl && !page.url().startsWith(postLoginUrl)) {
      stderr.write(`  Note: actual URL differs from requested (likely a redirect). Continuing anyway.\n`);
    }
  } catch (e) {
    stderr.write(`⚠ Could not navigate to ${postLoginUrl}: ${e.message}\n`);
    stderr.write(`  Continuing from wherever the browser ended up. Navigate manually if needed.\n`);
  }
} else {
  stderr.write('— No feature_path set; staying on the current page. Navigate manually before each step.\n');
}

const results = [];

for (const item of toMap) {
  const { tc_number, step_number, step_text, expected_result } = item;

  stderr.write('\n═══════════════════════════════════════════════════════════\n');
  stderr.write(`${tc_number} step ${step_number}\n`);
  stderr.write(`Step:     ${step_text}\n`);
  if (expected_result) stderr.write(`Expected: ${expected_result}\n`);
  stderr.write('═══════════════════════════════════════════════════════════\n');

  await ask('Navigate to the right screen state in the browser, then press Enter when ready: ');

  let suggestion = null;
  try {
    suggestion = await heuristicSuggest(page, step_text);
  } catch (e) {
    stderr.write(`(heuristic suggestion failed: ${e.message})\n`);
  }

  let captured = null;

  if (suggestion) {
    await highlight(page, suggestion.handle);
    stderr.write(`\nSuggested locator: ${suggestion.locator.value}  (kind=${suggestion.locator.kind}, score=${suggestion.score})\n`);
    stderr.write('The suggested element is highlighted in red. Press Enter to ACCEPT, or click the correct element in the browser, or type "skip" + Enter to skip this step.\n');

    const racePromise = Promise.race([
      ask(''),
      captureNextClick(page).then((el) => ({ click: el })),
    ]);
    const reply = await racePromise;
    await unhighlight(page, suggestion.handle).catch(() => {});

    if (typeof reply === 'string') {
      const r = reply.trim().toLowerCase();
      if (r === 'skip') {
        results.push({ step_text, selector: null, resolution: 'skipped' });
        continue;
      }
      // Empty string → accept suggestion
      captured = { handle: suggestion.handle, locator: suggestion.locator, resolution: 'heuristic-confirmed' };
    } else if (reply.click) {
      const locator = await bestLocatorFor(reply.click);
      captured = { handle: reply.click, locator, resolution: 'interactive' };
    }
  } else {
    stderr.write('\nNo heuristic suggestion. Click the element in the browser, or type "skip" + Enter to skip.\n');
    const racePromise = Promise.race([
      ask(''),
      captureNextClick(page).then((el) => ({ click: el })),
    ]);
    const reply = await racePromise;
    if (typeof reply === 'string') {
      if (reply.trim().toLowerCase() === 'skip') {
        results.push({ step_text, selector: null, resolution: 'skipped' });
        continue;
      }
      results.push({ step_text, selector: null, resolution: 'skipped' });
      continue;
    } else if (reply.click) {
      const locator = await bestLocatorFor(reply.click);
      captured = { handle: reply.click, locator, resolution: 'interactive' };
    }
  }

  if (captured) {
    if (captured.locator.kind === 'css-path') {
      stderr.write(`⚠ Captured a CSS path locator — these are brittle. Consider asking the UI team to add a data-testid.\n`);
    }
    stderr.write(`✓ Captured: ${captured.locator.value}  (resolution=${captured.resolution})\n`);
    results.push({
      step_text,
      selector: captured.locator.value,
      locator_kind: captured.locator.kind,
      resolution: captured.resolution,
    });
  }
}

await rl.close();
await browser.close();

stdout.write(JSON.stringify({ results }, null, 2) + '\n');
exit(0);
