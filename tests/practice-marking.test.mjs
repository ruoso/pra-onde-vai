// The practice frame's marking rules (docs/design.md, "Marking"), run on the
// frame's own logic: mockups/Practice.dc.html's Component, driven answer by
// answer through Cochichando's A and the start of B.
//
//   npm test
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const file = fileURLToPath(new URL('../mockups/Practice.dc.html', import.meta.url));
const html = readFileSync(file, 'utf8');
const code = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
class DCLogic {
  constructor() { this.props = {}; this.state = null; }
  setState(s) { this.state = Object.assign({}, this.state || {}, s); }
}
const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);

const c = new Component();
const seq = c.tune();
const at = () => seq[c.s().idx];
const lastMark = (bar, which = 0) => c.s().results[c.indexOfBar(seq, bar, which)];

function answer(id, expect) {
  const before = at();
  c.answer(id);
  const got = c.s().results[seq.indexOf(before)];
  assert.equal(got.kind, expect.kind, `bar ${before.bar} ${before.sym}: picked ${id}`);
  if (expect.reason) assert.equal(got.reason, expect.reason, `bar ${before.bar} ${before.sym}: reason`);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok   ' + name);
}

test('starts at bar 12, D7', () => assert.equal(at().sym, 'D7'));
test('the exact function is right', () => answer('V/iv', { kind: 'right' }));
test('right again: Gm, the iv', () => answer('iv', { kind: 'right' }));
test('your own chart’s path (C7 then F) is another way', () => {
  answer('V/III', { kind: 'another', reason: 'alt' });
  answer('III', { kind: 'another', reason: 'alt' });
});
test('going straight to A7 leaves the passing E7/B out: another way, and A7 is answered too', () => {
  answer('V', { kind: 'another', reason: 'skip' });
  assert.equal(lastMark(15, 1).kind, 'right');
  assert.equal(at().bar, 16);
});
test('an arrival (bar 16) counts only the exact chord', () => answer('III', { kind: 'miss', reason: 'arrival' }));
test('going straight from C7 to F asks whether home has moved', () => {
  answer('III', { kind: 'another', reason: 'skip' });
  assert.equal(c.s().pendingMove, true);
});
test('making F major home re-centres the board', () => {
  c.renderVals().moveYes();
  assert.equal(c.s().home, 'maj');
  assert.equal(at().sym, 'D7');
});
test('in F, the D7 is the V of ii', () => answer('V/ii', { kind: 'right' }));
test('right through bars 18–22', () => {
  answer('ii', { kind: 'right' });
  answer('V', { kind: 'right' });
  answer('I', { kind: 'right' });
  answer('V/vi', { kind: 'right' });
  answer('vi', { kind: 'right' });
});
test('another path of common moves (vi → ii → V) for G7 is another way', () => answer('ii', { kind: 'another', reason: 'path' }));
test('a chord doing the same job counts as another way, and a stray one is missed', () => {
  const d = new Component();
  const s = d.s();
  // Bar 7, E7 (the V of V): G#° does the same job; vi does not.
  const e7 = d.indexOfBar(seq, 7, 0);
  assert.deepEqual(d.mark(Object.assign({}, s, { idx: e7 }), seq, '#IV°'), { kind: 'another', reason: 'job' });
  assert.equal(d.mark(Object.assign({}, s, { idx: e7 }), seq, 'VI').kind, 'miss');
});
test('the run ends after bar 24 with its totals', () => {
  answer('V', { kind: 'right' });
  const v = c.renderVals();
  assert.equal(v.showDone, true);
  assert.deepEqual([v.nRight, v.nAnother, v.nMiss], ['18', '6', '1']);
});
console.log(`${passed} passed`);
