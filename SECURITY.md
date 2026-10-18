# Security reporting

The project is a prototype. Security maintenance targets the current master source and latest verified Windows portable; older binaries may need updating. Browser/Electron support and known verification limits are recorded in docs/MAINTAINING.md and IMPLEMENTATION_STATUS.md.

Do not post exploit details, recordings, personal scores or credentials in public issues. GitHub private vulnerability reporting is enabled (verified 2026-10-18). Use [Report a vulnerability](https://github.com/Monykus7/FourPataka/security/advisories/new) to contact the maintainer privately. If that service is unavailable, ask Monykus7 through the GitHub profile to arrange another private channel before sending sensitive details. There is no dedicated security email or guaranteed response SLA.

Include the commit/app version, OS, minimal synthetic project, expected/actual behavior and a reproduction. Maintainers acknowledge and assess the report, agree on safe reproduction and disclosure timing, fix with a regression test, then publish an advisory when appropriate. Remove personal data from fixtures. Coordinate disclosure with the maintainer rather than assuming this document sets an embargo deadline.

Important boundaries include the sandboxed renderer, trusted native origin checks, bounded JSON/WAV inputs, unavailable module recovery, local-only embeddings and source-reviewed modules. Bundled TypeScript modules run with application privileges; the feature contract is not an isolation boundary for hostile extension code. Score/project data must never load executable modules. CI uses read-only tokens, no deployment secrets and no pull_request_target checkout of contributor code.
