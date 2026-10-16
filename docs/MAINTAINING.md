# Maintaining and releasing FourPataka

Monykus7 owns merges, API compatibility, license review and release decisions. Reviewed source contributions are welcome under GPL-3.0-only with compatible upstream notices. The owner selected this license on 2026-10-15. Copyright stays with authors; there is no assignment/CLA requirement. Keep LICENSE unmodified and project copyright separate from the Free Software Foundation's copyright on the license text.

## Support and API policy

The verified application baseline is v0.37.1 on Windows x64; current automation targets Node24, Ubuntu22.04 bundled Chromium and Windows2022 Electron. Windows11 local runs are evidence, not proof that hosted runners or other devices pass. Source requires Node22.12+. Other browsers, Linux/macOS native packages, mobile, physical listening and screen readers are not currently verified support targets. Automated tests cannot close those manual gates.

Public bundled-source APIs are numeric metadata, pedals, Fourier preset factories, synthesis engines and declarative features, exported by src/modules/index.ts; chord API1 remains its own boundary. Source services for virtual files are documented separately. Numeric API1 does not imply identical dataVersion/schemaVersion or compatibility with arbitrary callbacks. Keep IDs stable; data changes require explicit migration or visible preserved unavailable data. Do not silently reinterpret missing/newer module settings. There is no runtime loader or general React/theme/file/grammar adapter.

During 0.x development, document breaking API changes in the milestone plan, contributor guide and implementation status, with migration fixtures before merge. Prefer a deprecation notice for one implementation release before removal; an exception needs an explicit rationale and recovery path. Application versions, per-module API/data versions and project schema are separate clocks. Do not bump an application version for documentation/tooling changes alone.

## Contribution review

```mermaid
flowchart LR
  A[Module and tests] --> B[Public import and registration review]
  B --> C[Compatibility and ownership proofs]
  C --> D[Browser and native example checks]
  D --> E[Maintainer review and merge]
```

Verify tutorials against the actual public import and explicit assembly. Review units, finite bounds, copied state, phase/clock continuity, processor disposal, measured latency/tails, source spans/revision guards and live/WAV parity as applicable. Run boundary/registry/compatibility suites and the affected example workflows. Decline unexplained third-party code/assets or dependency licensing changes until their notices and rights are reviewed. Use CODE_OF_CONDUCT.md and SECURITY.md for reports; establishing a dedicated private reporting channel remains an owner operational task.

## Repeatable checks

A fresh checkout runs npm ci using package-lock.json. The Contributor checks workflow uses commit-pinned official actions, read-only contents permissions, no publication secrets and pull_request/push/workflow_dispatch triggers. Linux checks format, complete dependency notices, tracked private-file exclusions, all units, build, knowledge freshness and five contributor browser suites with installed Playwright Chromium. Windows builds the portable, inspects the actual ASAR and runtime notices, and runs seven packaged startup/contributor workflows. Native profiles are isolated; no user data is uploaded.

Reproduce source checks with the commands in CONTRIBUTING.md. On Windows, desktop:package first runs desktop:setup (Electron's own installer). A fresh npm ci provides the JavaScript package; it does not guarantee node_modules/electron/dist exists before electron-builder reads electronDist. The installer checks its pinned version/checksums and reuses an existing matching runtime. No blanket dependency-script approval is needed.

On Windows:

```powershell
npm run desktop:package
npm run distribution:check -- release/win-unpacked
$env:FOURPATAKA_TEST_EXECUTABLE=(Resolve-Path 'release/win-unpacked/FourPataka.exe').Path
npx playwright test --config playwright.desktop.config.ts --grep "one cache owner|desktop loads local assets|contributed level pedal|registered Fourier preset|independent engine edits|feature panels retain|packaged swing"
```

CI artifacts are unsigned review builds retained for seven days on master pushes, paired with a source archive from the exact commit. They are not a public release or durable corresponding-source service. Logs/test profiles/model caches are excluded from upload. Repository settings, runner availability and branch-protection enforcement require owner configuration. Local pass results do not assert that hosted CI has run; record the actual run URL/result before closing that gate.

## Distribution and release

```mermaid
flowchart TD
  A[Reviewed exact source commit] --> B[Unit browser and native checks]
  B --> C[Build browser assets and Windows portable]
  C --> D[Verify app ASAR notices and exclusions]
  D --> E[Source archive plus build instructions and notices]
  E --> F[Maintainer approves public release]
```

For an application release, record version, exact commit, artifact checksums and actual tests in IMPLEMENTATION_STATUS.md. Build the browser and native package from that commit/lockfile; preserve Electron's LICENSE.electron.txt and LICENSES.chromium.html. The browser root includes LICENSE.txt and THIRD_PARTY_LICENSES.txt; Windows ASAR also contains project LICENSE and THIRD_PARTY_NOTICES.md. Regenerate and review notices after dependency updates. The drift checker accepts reviewed MIT/ISC/OFL metadata, retains full upstream license text and fails unknown types; that is not a complete legal audit of changed assets or runtime components.

Provide exact corresponding source alongside a publicly distributed GPL binary, including lockfile, scripts, module sources, assets/notices and build instructions. Retain that source durably for the chosen distribution method; an expiring CI artifact is insufficient for a lasting release link. Verify source archives exclude private editor/agent files, caches, node_modules, personal data and build outputs. Do not offer a binary from an uncommitted working tree as a reproducible public release. Document signing/default-icon status and manual/device limits.

Public release publication, repository visibility changes, npm/module publication, code signing, installation and branch-protection changes are separate owner actions. The workflow creates no GitHub Release, package publication or installer. After a verified x.x.0 application release, open the portable normally without diagnostic stderr flags; repeat launches should focus the current profile owner. Tooling-only M6 work needs no app version bump or portable replacement.

M6 is delivered in slices: licensing/notices and contributor automation/policies are implemented here. Clean hosted-run evidence, an exercised clean-checkout tutorial, private-reporting configuration and owner-reviewed public release remain explicit gates until verified; documentation does not mark them passed.

Hosted baseline: [run38802133636](https://github.com/Monykus7/FourPataka/actions/runs/38802133636) at commit41e841a passes source/browser and Windows portable/native/artifact jobs. This verifies the automated clean-checkout path; it does not complete the separate contributor tutorial, operational reporting or public-release gates.
