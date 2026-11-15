# Where this copy comes from

A copy of the cifra.md format and its JavaScript implementation from Estante
de Cifras (`cifra.md/` in that repository), MIT licensed, copyright Daniel
Ruoso. It is copied, not linked, so this repository builds on its own
(docs/implementation-plan.md, "Decisions taken").

- Source: `cifra.md/` of Estante de Cifras, commit `7916652f0583b8221be46f2143792f8d2a1413b6`.
- Copied: `js/src`, `js/test`, `js/README.md`, `js/package.json`,
  `corpus/` and `examples/` (which `js/test` reads), `spec/`, `schema/`
  and the top-level `README.md`.
- Not copied: the Go and Python implementations and `reference/`.

To refresh it, copy the same paths again from a newer commit, update the
commit above, and run `npm test`: the copy's own suite runs as part of it.
Change it here only to fix something, and send the fix back to Estante.
