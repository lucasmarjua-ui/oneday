# OneDay

[![CI](https://github.com/lucasmarjua-ui/oneday/actions/workflows/ci.yaml/badge.svg)](https://github.com/lucasmarjua-ui/oneday/actions/workflows/ci.yaml)
[![Deploy to GitHub Pages](https://github.com/lucasmarjua-ui/oneday/actions/workflows/deploy.yaml/badge.svg)](https://github.com/lucasmarjua-ui/oneday/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen)](https://lucasmarjua-ui.github.io/oneday/)
![No dependencies](https://img.shields.io/badge/dependencies-zero-orange)

OneDay is a data-driven decision game: pick an era, pick an archetype, customize a paper-doll character, then live a single day one decision card at a time. Every option costs time and resources and rolls against your archetype's strengths; the day ends when time runs out (a good ending) or a critical resource hits zero (a bad ending) — both with narrative text specific to the era. Built with HTML, CSS and vanilla JavaScript, no frameworks, no build step, fully bilingual (English/Spanish) from the first commit.

**[▶ Play now](https://lucasmarjua-ui.github.io/oneday/)**

## Play locally

No dependencies, no build step, nothing to install to play. The game uses native ES modules, so it needs to be served over `http://` rather than opened directly as a `file://` path (browser CORS rules block module imports from disk). Serve the repository root with any static server, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. (A `package.json` exists only to mark the code as ES modules and to give the test suite a `npm test` command — there is nothing to `npm install`.)

## How to play

1. On the home screen, pick a language (EN/ES, top right) and an era: **Ancient Greece**, **Neanderthals** or **Futuristic City** — the three MVP eras, all playable.
2. Choose an **archetype** — Warrior, Orator or Philosopher — which fixes your success-chance bonuses for the rest of the playthrough. No option is ever fully blocked by your archetype; it just makes some routes more reliable than others.
3. Customize your character's appearance: base look, outfit, headgear and an accessory, each just swapping a simple SVG layer (no hand-drawn art per combination).
4. Click **Begin the Day**. The day runs from 07:00 to 23:00 in a shared time budget; each decision costs a variable number of hours, so a full day is roughly 8-20 decisions depending on your choices.
5. Each decision card presents 2-4 options. Every option shows its time cost, resource cost, and success chance before you commit. Success and failure each have their own resource changes and narrative text, and some outcomes set flags that unlock or block later cards in the same day.
6. The day ends one of two ways, each with its own narrative closing: **time runs out** (a normal ending), or a critical resource (health) **hits zero** (a bad ending, with era-specific flavor text). The summary screen then shows your final resources, a checklist of the 3 objectives randomly picked for that playthrough, and a short recap of what happened.
7. Some titles are **meta-achievements**: they require accumulating a resource (like lifetime Arete) across multiple playthroughs of the same era, tracked on your profile once you log in.

## Architecture

```text
index.html                     Era selection, archetype choice, character appearance, login, profile
game.html                      The day loop: HUD, decision cards, outcomes, summary
shared/
  firebase-config.js           Firebase SDK initialization (client config, not a secret)
  auth.js                      Username/password auth + localStorage <-> Firestore sync
  era-registry.js              List of eras and loader for their era.json + cards.json
  rng.js                       Seeded PRNG (mulberry32) + seed generation (random and date-based)
  i18n.js                      Loads /data/i18n, tracks the chosen language, t()/localize() helpers
  resources.js                 Generic resource engine (create, apply deltas, clamp)
  day-engine.js                Time budget, current time-of-day slot, clock formatting
  character.js                 Paper-doll character creation, archetype selection, SVG render
  decision-engine.js           Card filtering by conditions/time slot, weighted pick, success rolls
  objectives.js                Daily objective pool selection and completion checks
  achievements.js              Cross-playthrough meta-progress and meta-achievement unlocks
  stats.js                     Per-era play statistics (days played, objectives completed)
  theme.css                    Shared visual theme, responsive layout
data/
  i18n/en.json, es.json        Fixed interface strings (buttons, menus, labels)
  eras/greece/era.json          Resources, archetypes, day structure, character options, objectives, endings
  eras/greece/cards.json        Decision cards for Ancient Greece (bilingual text throughout)
  eras/neanderthal/era.json     Same schema, a different resource/archetype set (see Eras built so far)
  eras/neanderthal/cards.json   Decision cards for the Neanderthal era
  eras/future-city/era.json     Same schema again, full resource set + two new SVG character shapes
  eras/future-city/cards.json   Decision cards for the Futuristic City era
tests/*.test.js                Unit tests for the engine, run with Node's built-in test runner
firestore.rules                Firestore security rules (reference, pasted into the console)
.github/workflows/ci.yaml      Runs the test suite on every push and pull request
.github/workflows/deploy.yaml  Publishes the static site to GitHub Pages on every push to main
```

Adding a new era means adding a new `data/eras/<id>/` folder (`era.json` + `cards.json`) and registering it in `shared/era-registry.js` — the engine itself does not change.

## The decision engine

Each era is entirely defined by two JSON files: `era.json` (resources, archetypes, day length, character customization options, objective pool, meta-achievements, ending narration) and `cards.json` (an array of decision cards). Nothing about a specific era is hardcoded in `shared/`. Every player-facing string is a bilingual object (`{ "en": "...", "es": "..." }`) rather than a plain string — see [Internationalization](#internationalization) below.

A decision card looks like this:

```json
{
  "id": "greece-market-haggle",
  "text": { "en": "A merchant in the agora offers imported pottery at a steep price.", "es": "Un mercader del ágora ofrece cerámica importada a un precio elevado." },
  "timeSlots": ["midday", "afternoon"],
  "weight": 4,
  "conditions": { "resources": { "currency": { "min": 5 } } },
  "options": [
    {
      "id": "haggle",
      "text": { "en": "Try to haggle the price down", "es": "Intenta regatear el precio" },
      "cost": { "time": 1, "resources": { "currency": -5 } },
      "successChance": { "base": 0.5, "archetypeBonus": { "modifier": "charm", "scale": 0.05 } },
      "success": { "resources": { "currency": 15, "reputation": 1 }, "text": { "en": "The merchant relents, impressed by your wit.", "es": "El mercader cede, impresionado por tu ingenio." }, "flagsSet": ["haggled-once"] },
      "failure": { "resources": { "reputation": -1 }, "text": { "en": "The merchant scoffs and waves you off.", "es": "El mercader se burla y te despacha con la mano." } }
    }
  ]
}
```

At each step, `getValidCards` filters the deck by the current time-of-day slot, resource conditions and required/excluded flags from earlier choices that day, then `pickWeightedCard` picks one using each card's `weight` and a **seeded RNG** (so, for example, a market card is more likely at midday than at midnight). `computeSuccessChance` clamps `base + archetypeModifier * scale` to `[0.05, 0.95]`, and the roll's outcome applies its resource deltas and any flags it sets. This small combinatorial space — ~25 cards × conditions × weighted time slots × archetype-influenced rolls — produces a different playthrough almost every time without hand-writing every path.

## Archetypes

Character creation is a fixed choice, not a point-buy: pick one archetype, which sets fixed bonuses toward a shared skeleton of success-chance modifiers (`might`, `wits`, `charm`, and `luck` for eras that use it). Each era declares which modifiers it uses and defines 3-4 archetypes on top of them — same engine, different narrative dressing, exactly like resources. Ancient Greece uses three:

| Archetype | Modifier | Flavor |
|---|---|---|
| Warrior | `might` | Trained for combat and physical endurance. |
| Orator | `charm` | A persuasive voice in the agora and the assembly. |
| Philosopher | `wits` | Sharp-minded, favoring strategy over force. |

A card option references at most one modifier (`successChance.archetypeBonus.modifier`), so an archetype never fully locks a player out of a route — it just makes some options more or less reliable.

## Seeded RNG

`shared/rng.js` provides a `mulberry32`-based seeded PRNG. Every function in the engine that needs randomness (`pickWeightedCard`, `resolveOption`, `pickDailyObjectives`) takes an `rng` function as a **required** argument — nothing in the engine calls `Math.random()` directly. Each playthrough creates one RNG instance from a fresh random seed (`createRng(randomSeed())`) and threads it through the whole day, so a given seed with the same choices always reproduces the exact same playthrough (see `tests/greece-data.test.js` for a determinism test that plays two identical seeded runs and asserts identical card sequences and final resources).

This is what makes the planned **Daily Challenge** mode possible later without touching the engine: `dailySeed(eraId, date)` already exists and hashes a date + era id into a seed, so "today's challenge" for a given era can share the exact same card sequence and roll outcomes for every player, differing only by the choices they make. Free play just uses `randomSeed()` instead — same engine, different seed source.

## Internationalization

The interface and all content are bilingual (English/Spanish) from the first commit:

- Fixed interface strings (buttons, headings, form labels) live in `data/i18n/en.json` and `data/i18n/es.json`, loaded once and looked up with `t(key)` from `shared/i18n.js`.
- Every piece of content text inside `era.json` and `cards.json` — card and option text, outcomes, resource/archetype/slot labels, objective descriptions, achievement titles, ending narration — is an object `{ "en": "...", "es": "..." }` instead of a plain string, read with `localize(field)`.
- The language selector (EN/ES buttons in the header) persists the choice to `localStorage` and re-renders the current screen in place via `onLanguageChange`, without losing game state.
- Code, variable/function names, comments and this README stay in English, matching the rest of this portfolio — only player-facing text is bilingual.

## Meta-progress and achievements

Two separate layers of goals:

- **Daily objectives**: 3 are picked at random (via the seeded RNG) from the era's `objectivesPool` at the start of each playthrough (e.g. "reach 300 drachmas", "never drop below 30 health"), checked against the day's final state and shown as a checklist on the summary screen.
- **Meta-achievements**: persistent titles tied to the player's account, unlocked by accumulating a resource across multiple playthroughs of the same era (e.g. "Archon of Athens" at 500 lifetime Arete earned). Progress is stored locally under the `oneday.progress` key, synced (like the rest of a signed-in player's data) inside their `users/{uid}` Firestore document, and checked at the end of every day.

## Testing

The engine's rules (card filtering, weighted selection, success-chance math, objective checks, RNG determinism) are covered by unit tests using Node's built-in test runner — zero test-framework dependencies, consistent with the rest of the project. Each era also has its own `tests/<era>-data.test.js` that validates its real `era.json`/`cards.json` content directly: every field that should be bilingual actually is, every archetype bonus references a modifier the era declares, and a simulated day across 100 different seeds always terminates without throwing.

```bash
npm test
```

`.github/workflows/ci.yaml` runs this on every push and pull request.

## Accounts and progress (Firebase)

OneDay uses its own Firebase project, independent of any other project in this portfolio. It works fully as a guest with no account: character, progress and stats are saved to `localStorage`. Logging in creates or authenticates with a **username and password** (internally mapped to a generated email, `username@oneday.local` — a real email is never asked for or shown). On login, local progress is merged into the `users/{uid}` Firestore document and kept in sync from then on.

### Pending setup in the Firebase console

The `firebaseConfig` in [`shared/firebase-config.js`](shared/firebase-config.js) is a placeholder. Firestore and the email/password provider cannot be enabled through the API or CLI — Google requires a first manual click for each in the console:

1. Create a Firebase project (e.g. `oneday-game`) and a Web App inside it, then copy the resulting config values into `shared/firebase-config.js`.
2. **Firestore Database → Create database** (pick a region) — a single click, no further configuration needed.
3. **Authentication → Get started → Sign-in method → Email/Password → Enable**.
4. **Authentication → Settings → Authorized domains**: add `lucasmarjua-ui.github.io` so login also works on GitHub Pages (`localhost` is already authorized).
5. **Firestore Database → Rules**: paste the contents of [`firestore.rules`](firestore.rules) and publish.

Everything else — including guest play — works without these steps.

## Technical decisions

**No build step, no frameworks.** The whole project is HTML, CSS and vanilla JavaScript with native ES modules. GitHub Pages serves the repository as-is, and anyone can clone it and open it (behind a static server) without installing anything. `package.json` exists only to declare ES module semantics for Node's test runner and has zero dependencies.

**Procedural character art, no image assets.** The paper-doll character is drawn entirely as inline SVG primitives (`shared/character.js`), colored and shaped from each era's `era.json`. Adding a new era's wardrobe means adding shape/color entries to a config file, not commissioning or hand-editing art.

**Data-driven content, engine-agnostic of era.** All narrative content, resources, archetypes and character options live in per-era JSON. The engine only knows about generic concepts (resources, modifiers, time slots, flags), so a new era is pure content, no code changes.

**Seeded RNG as a first-class dependency, not an afterthought.** Every random draw takes an explicit `rng` argument; nothing falls back to `Math.random()`. This keeps playthroughs reproducible for debugging today and makes the Daily Challenge mode (same seed for every player on a given day) a content/UI feature to add later, not an engine rewrite.

## Screenshots

| | |
|---|---|
| ![Era selection](screenshots/era-select.png) Era selection | ![Archetype selection](screenshots/archetype-select.png) Archetype selection |
| ![Character appearance](screenshots/character-creation.png) Character appearance | ![Day loop](screenshots/day-loop.png) A decision card mid-day |

![Summary](screenshots/summary.png)
End-of-day summary, with the era's own narrative ending

## Eras built so far

**Ancient Greece** (Warrior/Orator/Philosopher, `might`/`wits`/`charm`) was the original pilot. **Neanderthals** (Hunter/Shaman/Forager, `might`/`wits`/`luck`) was built second, specifically to stress-test whether the schema generalizes to a genuinely different world without touching `shared/`:

- **Resources**: Neanderthal fuses `hunger`/`thirst` into a single `survival` resource and drops separate `energy`/`hunger`/`thirst` pairing entirely — a different resource *set*, not just relabeled values. Every module that reads resources (`shared/resources.js`, the HUD, the summary screen, option-cost formatting) already iterates `era.resources` generically; nothing needed to change.
- **Archetypes**: Neanderthal introduces `luck` as an active modifier (unused by Greece) and drops `charm` — confirming the archetype system isn't implicitly tied to Greece's three names or roles.
- **Currency**: Neanderthal reuses the `currency` key internally (as "mismo motor, distinto disfraz" intends) for a survival-flavored "Provisions" resource instead of Greece's money-like "Drachmas". Nothing in the engine treats `currency` as behaviorally special — it's clamped and compared exactly like any other resource — so the key name carries no hidden economic assumption.
- **Character art**: Neanderthal's furs/head/tool wardrobe reuses Greece's existing SVG shape primitives (a rectangle torso as a hide wrap, a rod as a spear, a circle as a hide pouch) recolored and relabeled per era.json — no new shapes were added to `shared/character.js`.

No engine or schema changes were required — `data/eras/neanderthal/` plus one registration line in `shared/era-registry.js` was enough. `tests/neanderthal-data.test.js` encodes this as a regression check (different resource/modifier sets from Greece, `luck` actually exercised by a card, bilingual coverage, and a 100-seed simulated-day crash/determinism check), alongside the pre-existing `tests/greece-data.test.js`.

**Futuristic City** (Hacker/Executive/Runner, `might`/`wits`/`charm` — the same three modifiers as Greece) completes the MVP trio as an intentional "middle" case: structurally close to Greece (full six-resource set, an economy + reputation resource, no fusion), but with a fully distinct tone (gig-economy deliveries, corporate ladder-climbing, a hidden-server hacking questline mirroring Greece's shrine and Neanderthal's cave). Its wardrobe needed genuinely new visuals — a jumpsuit, an AR visor, a datapad, a companion drone — that the existing rod/rectangle/circle primitives from Greece and Neanderthal couldn't credibly stretch to. That required one small, deliberate engine change: `shared/character.js`'s shape renderers now take an optional second `accentColor` (alongside the existing `color`), sourced from `era.json` like every other visual property, so a shape can have a two-tone glow/highlight without hardcoding it into the renderer function itself (the mistake `tunic-fine`'s baked-in gold sash made in Greece — left as-is there, not repeated here). `tests/character.test.js` covers the fallback behavior directly (no accent color falls back to the base color, never a fixed default) alongside `tests/future-city-data.test.js`'s usual bilingual/schema/simulated-day checks.

## Roadmap

**Daily Challenge mode**: a deterministic per-day, per-era seed (`dailySeed`, already implemented) so every player gets the same card sequence and roll outcomes on a given day, plus a daily leaderboard per era in Firestore alongside the existing free-play leaderboard. Grow all three eras' card pools toward 40-60 cards each; add a fourth, dystopian city era (content only, same engine); more meta-achievements per era.

## License

MIT. Copyright Lucas Martinez, 2026. See [LICENSE](LICENSE).
