# Third-party notices

FourPataka source is copyright (c) 2026 Monykus7 and contributors, licensed under GPL-3.0-only; see LICENSE. Third-party works retain their own copyright and licenses.

`public/THIRD_PARTY_LICENSES.txt` records exact installed production dependency versions and complete distributed license/notice texts, including transitive dependencies. `npm run licenses:build` regenerates it from the lockfile and installed packages; `npm run licenses:check` rejects missing, stale or unreviewed entries. Review upstream copyright and license changes whenever updating dependencies. This inventory covers shipped application dependencies, not every development tool.

- React, React DOM, Scheduler, CodeMirror, Lezer and supporting libraries: MIT.
- Lucide icons: ISC plus notices included in its distributed LICENSE.
- DM Sans: SIL Open Font License 1.1, copyright The DM Sans Project Authors. Fonts are bundled unchanged; retain the complete OFL text and attribution when distributing them.
- Electron: MIT. Its distribution includes Chromium, Node.js and other components with separate notices. Preserve LICENSE.electron.txt and LICENSES.chromium.html alongside the Windows executable. The package verifier requires both. Their full notices are supplied by the pinned Electron distribution; do not replace them with this summary.

The studio synthesizes factory instrument waveforms and drum hits from code; it ships no external drum samples or impulse-response library. New assets require source, copyright and license review before inclusion. Optional local embedding models are downloaded separately and are not application assets; their caches and user project/test data are excluded from source and release bundles.

Browser distributions include LICENSE.txt and THIRD_PARTY_LICENSES.txt at their root. Windows bundles include those same assets, this file, the project LICENSE, and Electron/Chromium notices. Public binary releases must also provide the exact corresponding source and build instructions described in docs/MAINTAINING.md. Do not infer full release clearance from a list of SPDX identifiers alone.
