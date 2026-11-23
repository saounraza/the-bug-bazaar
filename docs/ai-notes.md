# AI notes

How AI was used to build The Bug Bazaar, what was kept, what changed and why. The project was
built with Claude Code (an AI coding agent working in the repo, running commands and tests). The
entries below are taken from that session. Every mistake listed really happened, and the
"caught by" column says what caught it.

> **Author's note:** <add your own reflections in your own words: what you reviewed line by line,
> what you rewrote, and anything you'd now do differently. Evaluators will ask about these.>

## Three notable AI uses

### 1. Building the mock backend (D1-2)

- **Prompt:** the whole assignment brief (the PDF) plus: _"I created a fresh React project and
  initialized the fresh repo and am looking for a complete solution that is mentioned in the
  attached PDF. Read it clearly and complete the requirements."_
- **What AI produced:** an MSW mock with seeded data (5,000 products from a fixed-seed PRNG),
  handlers for every endpoint, and a "chaos" config to force each listed error.
- **Kept:** the MSW approach, the deterministic seed (stable ids across reloads and tests), and
  running the **same handlers** in the browser and in Vitest.
- **Changed and why:** the generated code used `onUnhandledRequest`, the MSW 2 option name. The
  installed version is MSW 3, which renamed it to `onUnhandledFrame` (it now covers WebSockets
  too). `tsc` failed on it, and the fix was to read MSW's own type definitions instead of trusting
  memory. Several packages had moved past the AI's knowledge (React Router 8, MSW 3,
  TypeScript 7, Vitest 5), so every API was checked against `node_modules` before use. Vitest 5
  had also dropped the `bench()` helper, so the performance harness became a plain timed test.

### 2. Race-condition protection and its tests (D2-6)

- **Prompt (follow-up within the session):** make search always show results for the latest
  query under slow, out-of-order responses, and prove it with a test.
- **Kept:** RTK Query's per-argument cache plus reading `currentData` instead of `data`, and a
  deterministic test where the older query is the slower one.
- **Changed and why:** to check the test was really testing the fix, the bug was reintroduced on
  purpose (`data` instead of `currentData`). **The test still passed.** The out-of-order case is
  already handled by the keyed cache, and `currentData` protects a _different_ moment: while the
  new query loads, `data` still shows the previous results. A second test for that gap was added,
  and it does fail with the bug. Lesson: a passing test proves nothing until you've seen it fail.
  (The new test's first draft also failed for a silly reason: it searched "ducks", which matches
  zero products.)

### 3. Measuring performance (D4-2)

- **Prompt (follow-up):** measure the product list, fix the two slowest spots, and record before
  and after numbers.
- **Kept:** measuring in a production build in a real Chrome tab, long tasks plus DOM size as the
  metrics, and a Node timing harness for the API handler.
- **Changed and why:** the first browser script timed frames with `requestAnimationFrame` and
  reported an **85-second frame**. That's a throttled background tab, not jank, so the numbers were
  discarded. The script also ran past the tool's 45-second limit. It was rewritten to run in the
  background and use long tasks, which don't depend on rAF. Event Timing also came back empty
  because synthetic `.click()`s aren't trusted events. That's disclosed in `performance.md` rather
  than hidden.

## One AI mistake and how it was caught

**The architecture doc stated something false about the code.** The first draft of
`ARCHITECTURE.md` said _"features never import `app/` at runtime (only types)"_. It sounded right
and fit the intended design. Before committing, the claim was checked with a search for
`from '../../app/` inside `src/features`, which found **15 runtime imports**: the typed hooks
in `app/hooks.ts` and `NotFoundPage`. The paragraph was rewritten to describe the real rule (those
two are leaf modules, and `hooks.ts` only imports the store's _types_, so there's no runtime
cycle).

Smaller ones caught the same way, by checking claims against evidence before committing:

- A decisions entry described a StrictMode bug as if it had been **seen on screen** ("the page
  showed 'Request cancelled'"). It had only been reasoned about, never observed. Reworded.
- A note claimed the test suite "passed 7 runs in a row" after a flakiness fix. The real count was 6. Corrected in a follow-up commit.
- The accessible name of the cart link came out as "Cart 1item" (no space) after Prettier
  reformatted the JSX. Caught by a test that looks the link up by its name.
- A shell one-liner hung on Windows (it called `python`, which opened the Store stub and waited
  for input). It was stopped and the edit was made with a proper file edit instead.

**The pattern:** AI output was most wrong where it was most confident and least checked:
remembered APIs, and prose claims about the code. Types, tests, grep and Lighthouse caught
almost everything.

## One thing I wouldn't hand to AI

**The final call on security trade-offs for real money and real users,** such as where the
session token lives ([auth.md](auth.md)) or whether the idempotency scheme is enough for a real
payment provider. AI can lay out the options well (it wrote the comparison table), but the
decision depends on the threat model, the backend, compliance and who's accountable when it goes
wrong. That needs a person who owns the consequences, and a review by someone who knows the
production system.

> <Replace or extend with your own answer in your own words.>
