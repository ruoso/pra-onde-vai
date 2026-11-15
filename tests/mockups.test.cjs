// The mockups render outside the Design canvas: each page is loaded in jsdom
// with mockups/support.js, checked for its key text and for no unrendered
// {{holes}} or script errors, and driven through one interaction.
//
//   npm test
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const dir = path.join(__dirname, '..', 'mockups');
const checks = [
  ['Main.dc.html', '', ['Tap each chord as you hear it', 'Dm', 'A7', 'usual'], (d) => clickLabel(d, /^Gm, iv/), 'Gm'],
  ['Main.dc.html', '?scene=arrived', ['Make F major home'], null, null],
  ['Main.dc.html', '?scene=moved', ['F major'], null, null],
  ['Listen.dc.html', '', ['What am I hearing?', 'D minor'], (d) => clickText(d, 'Make D minor home'), 'Step 2'],
  ['Choose.dc.html', '', ['Cochichando', '93%', 'Predict'], (d) => clickText(d, 'Any key'), 'learn the moves'],
  ['Practice.dc.html', '', ['Cochichando', 'what comes next'], (d) => clickLabel(d, /^D7, V of iv/), 'Right: D7, the V of iv.'],
  ['Practice.dc.html', '?scene=move', ['Has home moved?'], (d) => clickText(d, 'Make F major home'), 'home is F major now'],
  ['Review.dc.html', '', ['How it went', 'another way', 'The pattern'], null, null],
  ['Levels.dc.html', '', ['Your levels', 'The V of V', '261'], (d) => clickLabel(d, /^Level 5,/), 'Level 5 · The other secondary dominants'],
  ['Marking.dc.html', '', ['Same move, another way', 'Your chart'], (d) => clickText(d, 'Accept my way for this tune'), 'Your way is accepted'],
];
function buttons(d) { return Array.from(d.querySelectorAll('button, a')); }
function clickLabel(d, re) { const b = buttons(d).find((x) => re.test(x.getAttribute('aria-label') || '')); if (!b) throw new Error('no button ' + re); b.click(); }
function clickText(d, t) { const b = buttons(d).find((x) => x.textContent.trim().includes(t)); if (!b) throw new Error('no button ' + t); b.click(); }
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let failed = 0;
  for (const [file, query, want, act, after] of checks) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push(String(e.message || e)));
    vc.on('error', (e) => errors.push(String(e)));
    const url = 'file://' + path.join(dir, file) + query;
    const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
    await new Promise((r) => dom.window.addEventListener('load', r));
    await tick(50);
    const d = dom.window.document;
    const textNow = () => d.body.textContent.replace(/\s+/g, ' ');
    const problems = [];
    if (textNow().includes('{{')) problems.push('unrendered {{holes}}');
    for (const w of want) if (!textNow().includes(w)) problems.push('missing "' + w + '"');
    if (act) {
      try { act(d); await tick(50); if (!textNow().includes(after)) problems.push('after the click, missing "' + after + '"'); }
      catch (e) { problems.push(String(e.message)); }
    }
    const fonts = errors.filter((e) => !/Could not load link|fonts.googleapis/.test(e));
    if (fonts.length) problems.push('errors: ' + fonts.join(' | ').slice(0, 300));
    console.log((problems.length ? 'FAIL ' : 'ok   ') + file + query + (problems.length ? ': ' + problems.join('; ') : ''));
    if (problems.length) failed += 1;
    dom.window.close();
  }
  process.exit(failed ? 1 : 0);
})();
