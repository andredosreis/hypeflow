# Documentation Layout

Read before creating a PRD, FDD, ADR, story, or diagram.

## Artifact Locations

| Artifact | Path | Naming |
|---|---|---|
| PRD | `docs/prd/hypeflow-os-prd.md` + `docs/prd/modules/<slug>.md` | one master + per-module |
| Architecture | `docs/architecture/hypeflow-os-architecture.md` + `docs/architecture/hlds/<slug>.md` | one master + per-feature HLD |
| FDD (Feature Design) | `docs/fdd/<feature>-fdd.md` | kebab-case feature slug |
| ADR | `docs/adrs/NNNN-<slug>.md` | sequential 4-digit prefix, kebab-case slug |
| Story | `docs/stories/<epic>.<story>.story.md` | e.g. `01.8.story.md` |
| Diagrams (Mermaid) | `docs/mermaid/<feature>-diagrams.md` | generated from FDD |
| Diagrams (C4) | `docs/c4/<feature>/` | generated from FDD |
| Guidelines | `docs/guidelines/<topic>.md` | one topic per file |

## Diagram Generation

Both generators read an FDD and produce diagrams under a documented folder. Prefer the slash commands over writing diagrams by hand:

- `/generate-mermaid docs/fdd/<file>.md` → `docs/mermaid/`
- `/generate-c4 docs/fdd/<file>.md` → `docs/c4/`

## ADRs

Use the `adrs-management` plugin skills rather than writing ADRs by hand:

- `/adrs-management:adr-identify` — scan a module for decisions needing an ADR
- `/adrs-management:adr-generate` — draft an ADR from a potential-ADR entry
- `/adrs-management:adr-link` — build bidirectional links between ADRs

## Language

Product docs in this repo are written in **Portuguese (pt-PT)** — match the existing style and accents when editing. Code identifiers, file names, and technical terms (Service, Gateway, Redis, etc.) stay in English.
