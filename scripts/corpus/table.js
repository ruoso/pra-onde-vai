// Reading the corpus table, data/choro.tsv: one row per chord as played.

export function readTable(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const head = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const row = {};
    head.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

/** The rows of each piece, by filename, in table order. */
export function byPiece(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.filename)) out.set(r.filename, []);
    out.get(r.filename).push(r);
  }
  return out;
}
