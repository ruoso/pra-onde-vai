// The app as the user meets it, screen by screen, on the real tune data: the
// map, choosing and practising a tune, how it went, the levels, the listening
// help and the settings. Each screen is checked with axe too.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { computeAccessibleName } from 'dom-accessibility-api';
import App from './App.jsx';
import { openStore } from '../storage/db.js';
import { realTunes, realStats } from '../test/data.js';
import { attemptOf } from '../core/levels/progress.js';

// The synth, watched: what the app asks it to play is part of what it does.
vi.mock('../audio/synth.js', () => ({ playChords: vi.fn(() => Promise.resolve()), playNotes: vi.fn(), stop: vi.fn(), setDetune: vi.fn() }));
const synth = await import('../audio/synth.js');

const data = { tunes: realTunes(), stats: realStats() };
let n = 0;

async function open(hash = '#/map', { store = null } = {}) {
  window.location.hash = hash;
  const s = store ?? (await openStore(`app-test-${n++}`));
  const user = userEvent.setup();
  const view = render(<App data={data} store={s} />);
  await screen.findByRole('navigation', { name: 'Screens' });
  await waitFor(() => expect(screen.queryByText('Loading the tunes…')).toBeNull());
  return { user, store: s, view };
}

// jsdom's name computation drops the spaces at the edges of the visually
// hidden pieces a browser reads ("Current home: D minor" comes out without
// the space), so names are compared with whitespace left out.
const squash = (x) => x.replace(/\s+/g, '');
const startsWith = (prefix) => (name) => squash(name).startsWith(squash(prefix));
const expectName = (el, text) => expect(squash(computeAccessibleName(el))).toBe(squash(text));
const chord = (name) => screen.getByRole('button', { name: startsWith(`${name},`) });

beforeEach(() => { document.documentElement.lang = 'en'; });

// The map asks where home is before it shows the board.
async function openMap(home = 'Dm') {
  const opened = await open('#/map');
  await opened.user.click(screen.getByRole('button', { name: startsWith(`${home},`) }));
  return opened;
}

describe('the guide', () => {
  it('is where the app lands, explains the parts, and leads into each', async () => {
    const { user } = await open('');
    expect(screen.getByRole('heading', { level: 1, name: 'Pra Onde Vai' })).toBeInTheDocument();
    for (const name of ['The map', 'What am I hearing?', 'Practise with a tune', 'Levels and drills', 'How answers are marked', 'Where to start']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/each chord sounds, then waits for you to find it/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('link', { name: 'Continue level 1 →' }));
    expect(await screen.findByRole('heading', { name: 'Your levels' })).toBeInTheDocument();
  });

  it('lands there every time, not only the first', async () => {
    const store = await openStore(`app-test-${n++}`);
    await open('', { store });
    cleanup();
    await open('', { store });
    expect(screen.getByRole('heading', { name: 'How answers are marked' })).toBeInTheDocument();
  });

  it('links each part to its screen', async () => {
    await open('#/guide');
    expect(screen.getByRole('link', { name: 'Open the map →' })).toHaveAttribute('href', '#/map');
    expect(screen.getByRole('link', { name: 'Find home by ear →' })).toHaveAttribute('href', '#/listen');
    expect(screen.getByRole('link', { name: 'Choose a tune →' })).toHaveAttribute('href', '#/tunes');
    expect(screen.getByRole('link', { name: 'Credits and settings' })).toHaveAttribute('href', '#/about');
  });

  it('shows how to install: the browser’s prompt, the iPhone steps, or that it is installed', async () => {
    const pwa = await import('../pwa/pwa.js');
    pwa.resetPwa({ canInstall: true });
    await open('#/guide');
    expect(screen.getByRole('button', { name: 'Install the app' })).toBeInTheDocument();
    cleanup();
    pwa.resetPwa({ platform: 'ios' });
    await open('#/guide');
    expect(screen.getByText('Choose Add to Home Screen.')).toBeInTheDocument();
    cleanup();
    pwa.resetPwa({ installed: true });
    await open('#/about');
    expect(screen.getByText('Installed on this device. Everything works with no network.')).toBeInTheDocument();
    cleanup();
    pwa.resetPwa({ updateReady: true });
    await open('#/map');
    expect(screen.getByRole('status')).toHaveTextContent('A new version of the app is ready.');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    pwa.resetPwa();
  });

  it('has no accessibility violations', async () => {
    const { view } = await open('#/guide');
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe('the map', () => {
  it('asks where home is, and never assumes one', async () => {
    const { user } = await open('#/map');
    expect(screen.getByRole('heading', { name: 'Where is home?' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Major keys' })).getAllByRole('button')).toHaveLength(12);
    expect(within(screen.getByRole('group', { name: 'Minor keys' })).getAllByRole('button')).toHaveLength(12);
    expect(screen.queryByRole('group', { name: 'The board of chord functions' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Bb, Bb major' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: Bb major,') })).toBeInTheDocument();
    expectName(chord('Bb'), 'Bb, I, Home');
    expect(chord('F7')).toBeInTheDocument();
    // New home: back to the question, for the next tune.
    await user.click(screen.getByRole('button', { name: 'New home' }));
    expect(screen.getByRole('heading', { name: 'Where is home?' })).toBeInTheDocument();
  });

  it('sends you to find home by ear when you don’t know it', async () => {
    const { user } = await open('#/map');
    await user.click(screen.getByRole('link', { name: 'Don’t know? Find it by ear →' }));
    expect(await screen.findByRole('heading', { name: 'What am I hearing?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Use the map’s home/ })).toBeNull();
  });

  it('lights the usual moves from the chord you tap', async () => {
    const { user } = await openMap('Dm');
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
    expectName(chord('Dm'), 'Dm, i, Home');
    expect(chord('A7')).toBeInTheDocument();
    await user.click(chord('Dm'));
    expectName(chord('A7'), 'A7, V, a sometimes next move');
    await user.click(chord('A7'));
    expectName(chord('Dm'), 'Dm, i, a usual next move, Home');
    expect(within(screen.getByRole('list', { name: 'Played' })).getAllByRole('button').map((x) => x.getAttribute('aria-label'))).toEqual(['Remove Dm', 'Remove A7']);
  });

  it('asks "visiting, or moving in?" on a destination, and makes it home', async () => {
    const { user } = await openMap('Dm');
    await user.click(screen.getByRole('radio', { name: 'Whole board' }));
    await user.click(chord('C7'));
    expectName(chord('F'), 'F, III, a usual next move');
    await user.click(chord('F'));
    expect(screen.getByText('You are on F, the III of D minor.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make F major home' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: F major,') })).toBeInTheDocument();
    expect(screen.getByText('Home is now F major. Same positions, new chord names.')).toBeInTheDocument();
    // Same positions, new names: the D7 is now the V of ii.
    expect(startsWith('D7, V of ii')(computeAccessibleName(chord('D7')))).toBe(true);
    await user.click(screen.getByRole('button', { name: startsWith('Go back to D minor,') }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
    expect(startsWith('D7, V of iv')(computeAccessibleName(chord('D7')))).toBe(true);
  });

  it('plays back what was played, across a change of home, and resets to the first home', async () => {
    const { user } = await openMap('Dm');
    const playBack = screen.getByRole('button', { name: 'Play back' });
    expect(playBack).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Whole board' }));
    for (const c of ['Dm', 'A7', 'Dm', 'C7', 'F']) await user.click(chord(c));
    await user.click(screen.getByRole('button', { name: 'Make F major home' }));
    await user.click(chord('D7'));
    synth.playChords.mockClear();
    await user.click(playBack);
    expect(synth.playChords).toHaveBeenCalledTimes(1);
    expect(synth.playChords.mock.calls[0][0].map((c) => c.sym)).toEqual(['Dm', 'A7', 'Dm', 'C7', 'F', 'D7']);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Go back to/ })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Played' })).queryAllByRole('listitem')).toHaveLength(0);
    expect(playBack).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('takes a chord out of what was played, and undoes step by step, a change of home too', async () => {
    const { user } = await openMap('Dm');
    for (const c of ['Dm', 'A7', 'Dm', 'C7', 'F']) await user.click(chord(c));
    const playedList = () => within(screen.getByRole('list', { name: 'Played' }));
    // A wrong tap in the middle: take the A7 out.
    await user.click(playedList().getByRole('button', { name: 'Remove A7' }));
    expect(playedList().getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Remove Dm', 'Remove Dm', 'Remove C7', 'Remove F']);
    await user.click(screen.getByRole('button', { name: 'Make F major home' }));
    expect(playedList().getByText('home: F major')).toBeInTheDocument();
    // Undo the change of home: D minor is home again, on the F.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
    expect(playedList().queryByText('home: F major')).toBeNull();
    expect(screen.getByText('You are on F, the III of D minor.')).toBeInTheDocument();
    // Undo a chord: the C7 is current again.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    synth.playChords.mockClear();
    await user.click(screen.getByRole('button', { name: 'Play back' }));
    expect(synth.playChords.mock.calls[0][0].map((c) => c.sym)).toEqual(['Dm', 'Dm', 'C7']);
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('shows the whole run as a chart, and copies it as cifra.md', async () => {
    const { user } = await openMap('Dm');
    for (const c of ['Dm', 'A7', 'Dm', 'C7', 'F']) await user.click(chord(c));
    await user.click(screen.getByRole('button', { name: 'Make F major home' }));
    for (const c of ['D7', 'Gm', 'C7', 'F']) await user.click(chord(c));
    await user.click(screen.getByRole('button', { name: 'See it all' }));
    const dialog = screen.getByRole('dialog', { name: 'What you played' });
    const minor = within(dialog).getByRole('region', { name: 'D minor' });
    expect(within(minor).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Dmi', 'A7V', 'Dmi', 'C7V of III', 'FIII']);
    expect(within(within(dialog).getByRole('region', { name: 'F major' })).getAllByRole('listitem')).toHaveLength(4);

    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Cochichando, by ear');
    await user.click(within(dialog).getByRole('button', { name: 'Copy as cifra.md' }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text.split('\n').slice(0, 9)).toEqual([
      '# Cochichando, by ear', '- key: Dm', '- notation: brazilian', '', '## D minor', '```', 'Dm | A7 | Dm | C7', 'F', '```',
    ]);
    expect(text).toContain('## F major\n```\nD7 | Gm | C7 | F\n```\n\nFunctions: V of ii · ii · V · I\n');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Copied: paste it into Estante de Cifras, or anywhere.');
    expect(within(dialog).getByRole('textbox', { name: 'The cifra.md text' })).toHaveValue(text);

    // A browser that will not copy: say so, and the text is there to select.
    writeText.mockRejectedValueOnce(new Error('denied'));
    await user.click(within(dialog).getByRole('button', { name: 'Copy as cifra.md' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('select the text below');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('changes home from the current home: replacing it before anything is played, as a change of home after', async () => {
    const { user } = await openMap('Dm');
    await user.click(screen.getByRole('button', { name: startsWith('Current home: D minor,') }));
    let dialog = screen.getByRole('dialog', { name: 'Change home' });
    await user.click(within(dialog).getByRole('button', { name: 'C, C major' }));
    // Nothing played yet: C major simply is home now, with no way back to D minor.
    expect(screen.getByRole('button', { name: startsWith('Current home: C major,') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Go back to/ })).toBeNull();

    await user.click(chord('G7'));
    await user.click(screen.getByRole('button', { name: startsWith('Current home: C major,') }));
    dialog = screen.getByRole('dialog', { name: 'Change home' });
    await user.click(within(dialog).getByRole('button', { name: 'Am, A minor' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: A minor, relative key') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: startsWith('Go back to C major,') })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Played' })).getByText('home: A minor')).toBeInTheDocument();
    expect(chord('E7')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: C major,') })).toBeInTheDocument();
  });

  it('moves to the parallel key and back, the dominant unchanged', async () => {
    const { user } = await openMap('Dm');
    await user.click(screen.getByRole('radio', { name: 'major' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D major,') })).toBeInTheDocument();
    expect(chord('A7')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'minor' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /D major/ })).toBeNull();
  });

  it('shows the whole board, and only the learner’s level when asked, in the same places', async () => {
    const { user } = await openMap('Dm');
    const chords = () => document.querySelectorAll('.board .chord');
    expect(chords()).toHaveLength(18);
    await user.click(screen.getByRole('radio', { name: 'Level 1' }));
    expect(chords()).toHaveLength(2);
    expect(screen.queryByRole('button', { name: startsWith('E7,') })).toBeNull();
  });

  it('has no accessibility violations, asking for home or showing the board', async () => {
    const { view, user } = await open('#/map');
    expect(await axe(view.container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: startsWith('Dm,') }));
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe('practising a tune', () => {
  it('chooses Cochichando, plays it, marks each answer, asks if home moved, and says how it went', async () => {
    const { user, store } = await open('#/tunes/cochichando');
    expect(screen.getByRole('heading', { name: 'Cochichando' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: startsWith('Cochichando, Pixinguinha') })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: /Start/ }));

    expect(screen.getByRole('heading', { name: 'Cochichando' })).toBeInTheDocument();
    // Name it, the way tunes start: the chord sounds, then you find it.
    expect(screen.getByText('Cochichando')).toBeInTheDocument();
    expect(screen.getByText('A → B · as written · Name it')).toBeInTheDocument();
    expect(screen.getByText('Bar 2: after Dm, which chord is this?')).toBeInTheDocument();
    await user.click(chord('A7'));
    expect(screen.getByText('Right: A7, the V.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 right, 0 another way, 0 missed' })).toBeInTheDocument();

    // A wrong answer: A7 where the tune goes home.
    await user.click(chord('A7'));
    expect(screen.getByText('It was Dm, the i.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show me' }));
    expect(screen.getByText(/^Shown, and counted as a miss\. Bar \d+: after /)).toBeInTheDocument();

    // Show the rest of A, to the change of home.
    while (!screen.queryByRole('button', { name: 'Make F major home' })) {
      await user.click(screen.getByRole('button', { name: 'Show me' }));
    }
    expect(screen.getByText('A new section, and it lands on F. Has home moved?')).toBeInTheDocument();
    expect(screen.getByText('You heard C7, then F, the III. A visit, or the new home?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make F major home' }));
    expect(screen.getByText('Right: home is F major now.')).toBeInTheDocument();
    expect(screen.getByText('F major')).toBeInTheDocument();
    // At level 1, D7 (the V of ii) and Gm (the ii) are played for you: C7 is asked.
    expect(screen.getByText(/Bar 3: after Gm, which chord is this\?$/)).toBeInTheDocument();
    await user.click(chord('C7'));
    expect(screen.getByText('Right: C7, the V.')).toBeInTheDocument();

    while (!screen.queryByRole('link', { name: 'See how it went' })) {
      await user.click(screen.getByRole('button', { name: 'Show me' }));
    }
    await user.click(screen.getByRole('link', { name: 'See how it went' }));
    expect(await screen.findByRole('heading', { name: 'How it went' })).toBeInTheDocument();
    expect(screen.getByText('Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: (n) => squash(n).startsWith('A1–4') && n.includes('Lost at bar 4') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Practise the \d+ misses/ })).toBeInTheDocument();

    // Every answer was kept for mastery.
    const kept = await store.attempts();
    expect(kept.length).toBeGreaterThan(20);
    expect(kept[0]).toMatchObject({ mode: 'min', fn: 'V', ok: true, key: 'Dm' });
  });

  it('turns the misses into a drill in random keys', async () => {
    const { user } = await open('#/tunes/cochichando');
    await user.click(screen.getByRole('radio', { name: 'A' }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    while (!screen.queryByRole('link', { name: 'See how it went' })) {
      await user.click(screen.getByRole('button', { name: 'Show me' }));
    }
    await user.click(screen.getByRole('link', { name: 'See how it went' }));
    await user.click(await screen.findByRole('button', { name: /Practise the \d+ misses/ }));
    expect(screen.getByRole('heading', { name: 'Drill · your misses' })).toBeInTheDocument();
    expect(screen.getByText(/^Bar 2: after /)).toBeInTheDocument();
  });

  it('offers each part, each join of the form, the returns included, and the whole tune', async () => {
    const { user } = await open('#/tunes/cochichando');
    const group = screen.getByRole('radiogroup', { name: 'Sections' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['A', 'B', 'C', 'A → B', 'B → A', 'A → C', 'C → A', 'Whole tune']);
    expect(within(group).getByRole('radio', { name: 'A → B' })).toBeChecked();
    expect(screen.getByText('From A in D minor into B in F major: you decide when home has moved.')).toBeInTheDocument();
    await user.click(within(group).getByRole('radio', { name: 'C → A' }));
    expect(screen.getByText('From C in D major into A in D minor: you decide when home has moved.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start/ }));
    expect(screen.getByText('C → A · as written · Name it')).toBeInTheDocument();
    // C starts in D major: the run starts there.
    expect(screen.getByText('D major')).toBeInTheDocument();
    expect(screen.getByText(/^Bar \d+: after .+, which chord is this\?$/)).toBeInTheDocument();
  });

  it('can predict instead: it stops before each change and asks what comes next', async () => {
    const { user } = await open('#/tunes/cochichando');
    await user.click(screen.getByRole('radio', { name: 'Predict' }));
    expect(screen.getByText(/Without the melody, several answers can be right\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start/ }));
    expect(screen.getByText('A → B · as written · Predict')).toBeInTheDocument();
    expect(screen.getByText('Bar 2: after Dm, what comes next?')).toBeInTheDocument();
  });

  it('plays a tune in any key, its chords spelled in that key', async () => {
    const { user } = await open('#/tunes/cochichando');
    await user.click(screen.getByRole('radio', { name: 'Any key' }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    const sub = screen.getByText(/A → B · in /).textContent;
    expect(sub).not.toMatch(/D minor/);
  });

  it('finds tunes by title or composer, accents or none', async () => {
    const { user } = await open('#/tunes');
    await user.type(screen.getByRole('searchbox', { name: 'Search by title or composer' }), 'tico-tico');
    // The title, and the composer of A moçada no samba, Tico-Tico.
    expect(screen.getAllByRole('option').map((o) => o.textContent.split(',')[0]).sort()).toEqual(['A moçada no samba', 'Tico-tico no fubá']);
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'joao de barro');
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
    await user.click(screen.getByRole('radio', { name: 'Major' }));
    expect(screen.getAllByRole('option').every((o) => !/, in [A-G][#b]?m[^a-z]/.test(o.textContent))).toBe(true);
  });

  it('has no accessibility violations, choosing or practising', async () => {
    const { user, view } = await open('#/tunes/cochichando');
    expect(await axe(view.container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: /Start/ }));
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe('levels', () => {
  it('starts at level 1, with level 2 locked', async () => {
    const { user } = await open('#/levels');
    expect(screen.getByRole('link', { name: 'Level 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: startsWith('Level 1 · Home and its dominant, current') })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: startsWith('Level 2 ·') }));
    expect(screen.getByRole('button', { name: 'Locked: finish level 1 first' })).toBeDisabled();
  });

  it('moves on to level 2 when level 1 is mastered in both modes', async () => {
    const store = await openStore(`app-test-${n++}`);
    const master = (mode, fn) => Array.from({ length: 20 }, (_, i) => attemptOf(mode, fn, 'right', ['C', 'F', 'G'][i % 3], i));
    await store.addAttempts([...master('maj', 'I'), ...master('maj', 'V'), ...master('min', 'i'), ...master('min', 'V')]);
    await open('#/levels', { store });
    expect(screen.getByRole('link', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: startsWith('Level 1 · Home and its dominant, done') })).toBeInTheDocument();
  });

  it('says what is left when major is mastered and minor is not, and the drill goes there until level 2 unlocks', async () => {
    const store = await openStore(`app-test-${n++}`);
    const right = (mode, fn, count, keys) => Array.from({ length: count }, (_, i) => attemptOf(mode, fn, 'right', keys[i % keys.length], i));
    // I and V mastered in major; i and V in minor one right answer short.
    await store.addAttempts([...right('maj', 'I', 20, ['C', 'F', 'G']), ...right('maj', 'V', 20, ['C', 'F', 'G']),
      ...right('min', 'i', 16, ['Am', 'Dm', 'Em']), ...right('min', 'V', 16, ['Am', 'Dm', 'Em'])]);
    const { user } = await open('#/levels/1', { store });
    const progress = screen.getByRole('region', { name: 'To unlock level 2' });
    expect(within(progress).getByText('2 chords to go')).toBeInTheDocument();
    expect(within(progress).getAllByText('✓ mastered')).toHaveLength(2);
    expect(within(progress).getAllByText('16 of 17 right · 3 of 3 keys')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Continue level 1' }));
    expect(screen.getByRole('region', { name: 'To unlock level 2' })).toBeInTheDocument();
    // Name it: the chord asked is the last one played. Answer it, as a listener
    // who heard it would, until the level is done.
    const heard = () => synth.playChords.mock.calls.at(-1)[0].at(-1).sym;
    for (let i = 0; i < 60 && !screen.queryByText('Level 2 is unlocked.'); i += 1) {
      if (screen.queryByRole('link', { name: 'See how it went' })) {
        await user.click(screen.getByRole('link', { name: 'See how it went' }));
        await user.click(await screen.findByRole('button', { name: 'Another drill' }));
        continue;
      }
      await user.click(chord(heard()));
    }
    expect(screen.getByText('Level 2 is unlocked.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Level 2' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To unlock level 2' })).getByText('Every chord mastered')).toBeInTheDocument();
  });

  it('unlocks a level ahead on request, keeps it, and goes back to the earned level', async () => {
    const { user, store } = await open('#/levels/3');
    expect(screen.getByRole('button', { name: 'Locked: finish level 1 first' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Unlock level 3 now' }));
    expect(screen.getByRole('alertdialog', { name: 'Move ahead to level 3?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(screen.getByRole('link', { name: 'Level 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue level 3' })).toBeEnabled();
    expect(screen.getByRole('option', { name: startsWith('Level 1 · Home and its dominant, unlocked by you') })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: startsWith('Level 3 · The V of V, current') })).toBeInTheDocument();
    expect((await store.getSettings()).unlockedLevel).toBe(3);
    expect(screen.getByText('You moved ahead to level 3; your answers have earned level 1.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go back to level 1' }));
    expect(screen.getByRole('link', { name: 'Level 1' })).toBeInTheDocument();
    expect((await store.getSettings()).unlockedLevel).toBeNull();
  });

  it('starts a drill of the level on the whole board, with "Something else" for chords above it', async () => {
    const { user } = await open('#/levels/1');
    await user.click(screen.getByRole('button', { name: 'Continue level 1' }));
    expect(screen.getByRole('heading', { name: 'Drill · level 1' })).toBeInTheDocument();
    // Every chord of the board, not just the two of level 1: the buttons give nothing away.
    expect(document.querySelectorAll('.board .chord').length).toBeGreaterThanOrEqual(18);
    expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
  });

  it('meets a chord in three tunes', async () => {
    const { user } = await open('#/levels/4');
    await user.click(screen.getByRole('radio', { name: 'Major' }));
    await user.click(screen.getByRole('link', { name: 'V of ii' }));
    expect(screen.getByRole('heading', { name: 'Meet it: the V of ii' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Hear it' })).toHaveLength(3);
  });

  it('has no accessibility violations', async () => {
    const { view } = await open('#/levels');
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe('what am I hearing?', () => {
  const tapNotes = async (user, names) => {
    const pad = screen.getByRole('group', { name: 'Add a note; each one sounds' });
    for (const nm of names) await user.click(within(pad).getByRole('button', { name: nm }));
  };

  it('finds home from the notes, then names the chord', async () => {
    const { user } = await open('#/listen');
    expect(screen.getByText('Not known yet')).toBeInTheDocument();
    await tapNotes(user, ['F', 'E', 'G', 'Bb', 'A', 'E', 'C#', 'D']);
    const cards = screen.getAllByRole('button', { pressed: true });
    expect(cards[0]).toHaveTextContent(/^D minor8 of 8 notesYour notes come to rest on D, its tonic\./);
    await user.click(screen.getByRole('button', { name: 'Make D minor home' }));
    expect(screen.getByText('Step 2: name the chord. Enter the notes you hear, melody or bass.')).toBeInTheDocument();
    await tapNotes(user, ['E', 'G', 'C#']);
    expect(screen.getAllByRole('button', { pressed: true })[0]).toHaveTextContent(/^A7V8? ?3 of 3 notesC# is outside D minor: here it is the 3rd\./);
    await user.click(screen.getByRole('button', { name: 'Open the map in Dm →' }));
    expect(screen.getByRole('button', { name: startsWith('Current home: D minor,') })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { view } = await open('#/listen');
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe('settings', () => {
  it('speaks Portuguese when chosen, and remembers it', async () => {
    const { user, store } = await open('#/about');
    await user.click(screen.getByRole('radio', { name: 'Português (Brasil)' }));
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(await screen.findByRole('link', { name: 'Mapa' })).toBeInTheDocument();
    expect((await store.getSettings()).language).toBe('pt-BR');
    await act(async () => { await user.click(screen.getByRole('radio', { name: 'Automático' })); });
  });

  it('resets progress after asking', async () => {
    const store = await openStore(`app-test-${n++}`);
    await store.addAttempts([attemptOf('maj', 'V', 'right', 'C')]);
    const { user } = await open('#/about', { store });
    expect(screen.getByText('Kept on this device: 1 answer.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.getByRole('alertdialog', { name: 'Reset your progress?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(await screen.findByText('Your progress has been reset.')).toBeInTheDocument();
    expect(await store.attempts()).toEqual([]);
  });

  it('credits the corpus and states the licences', async () => {
    const { view } = await open('#/about');
    expect(screen.getByRole('link', { name: 'github.com/DCMLab/choro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CC BY-NC-SA 4.0' })).toBeInTheDocument();
    expect(screen.getByText('The app’s code is under the MIT License.')).toBeInTheDocument();
    expect(await axe(view.container)).toHaveNoViolations();
  });
});
