# Build Directive

**What this is:** operating instructions for turning a PRD into working software. Copy it into
the root of any project, fill in the three placeholders in section 1, and hand it to whoever or
whatever is doing the building. It defines who reviews what, what blocks a merge, and how much
process this particular project actually needs.

**What it assumes:** you have a PRD. If you do not, stop here. This directive tells you how to
build a thing correctly, not how to decide what to build.

---

## 1. Fill these in first

```
PROJECT:          RioMed AI (originally specified as "MedPulse AI"; renamed 2026-09-27)
PRD:              docs/PRD.md
STAKES TIER:      3 overall; per-component tiers in docs/PRD.md section 13
SOURCE OF TRUTH:  src/core/ (pure TypeScript domain logic; see docs/PRD.md section 9.2)
```

Everything below is generic. These four lines are what make it about your project.

---

## 2. Before writing any code: interrogate the PRD

**This is the step most projects skip and most projects regret.** A PRD describes what someone
wants. It is almost never a complete description of what must be built. The gap between those
two is where schedule overruns live.

Spend the first session answering these in writing, in the repository, as `prd-questions.md`.

### What the PRD should already tell you

If any of these is missing, get it before building. Guessing here is the single most expensive
mistake available.

- **What is being built**, in one paragraph a stranger would understand.
- **Who uses it**, and which of them matters most when two of them conflict.
- **What done means**, stated so it can be checked rather than argued about.
- **What is explicitly out of scope.** A PRD without exclusions has not been thought through.
- **What must be true for this to be worth building.** If that assumption is wrong, you want to
  find out in week one rather than month six.

### What PRDs almost always omit

Go through this list every time. It is short, and it catches most of what gets discovered late.

| Gap | The question to ask |
| --- | --- |
| Error states | What does the user see when it fails, and what do we do about it? |
| Empty states | What does this look like with no data, on day one? |
| Scale | How many users, requests, rows, at launch and at 100x? |
| Permissions | Who can see and do what? What happens on the boundary? |
| Failure of dependencies | What happens when the thing we call is down or slow? |
| Data lifecycle | What is retained, for how long, and who can delete it? |
| Migration | How does existing data or an existing system get here? |
| Rollback | If this ships and is wrong, how do we undo it? |
| Concurrency | What happens when two people do this at the same time? |
| Money and limits | What stops a bug or an abuser from costing us unboundedly? |

### Then write down three things

**The riskiest assumption.** The one that, if wrong, makes the rest pointless. Plan to test it
first, cheaply, before building on top of it.

**The one-way doors.** Decisions that are expensive or impossible to reverse: data models,
public interfaces, anything users come to depend on, anything that touches money or identity.
These get an ADR and real argument. Everything else can be decided fast and changed later.

**What you would have to see to stop.** If there is no answer, this is not a project, it is a
commitment, and it will consume whatever it is given.

---

## 3. Calibrate the process to the stakes

Running heavy process on a throwaway tool is how teams learn to ignore process. Pick a tier
honestly and write it at the top of the file.

| | **Tier 1: light** | **Tier 2: standard** | **Tier 3: heavy** |
| --- | --- | --- | --- |
| Use when | Internal tool, prototype, spike. No user data, no money, trivially reversible | Production service with real users. Failures are recoverable | Holds money, holds sensitive data, or is very hard to change once shipped |
| Roles required | Implementer, Reviewer | Add Test Author, plus Adversary on money, auth and data paths | All six, on everything |
| ADRs | One-way doors only | Anything non-obvious | Every non-trivial change |
| Tests written by | Anyone | Someone other than the implementer, on anything that matters | Always someone other than the implementer |
| Merge gates | Review passes | Review, tests, no new warnings | All of section 9, including the extra gates |

**Tier is per component, not per project.** A payments path inside a tier 1 tool is tier 3. When
in doubt about a specific change, ask what happens if it is silently wrong for a month, and pick
the tier that matches the answer.

---

## 4. The non-negotiables

These hold at every tier. If one is genuinely wrong for your project, change it here first, in
its own commit, with reasoning. Never work around one silently.

**N1. Decisions that are hard to reverse get written down before they are made.** Problem, at
least two real alternatives, the choice, and why. "Real" means an option someone could plausibly
have picked, not a strawman erected to be knocked down.

**N2. Whoever writes the code does not approve it, and does not write its tests alone.** Tests
written from the implementation inherit the implementation's misunderstandings. This is the
single highest-value rule in the document.

**N3. Core logic lives in one place.** Name it in section 1. Anything that must give the same
answer in two contexts gets written once and called twice. Where a second implementation is
unavoidable, for example because two runtimes cannot share code, the two are tested against each
other mechanically, not by care.

**N4. Every claim the PRD makes that the code implements has a test that fails if the claim is
false.** If a claim cannot be tested, it is too vague, and the PRD gets fixed rather than the
claim quietly dropped.

**N5. Where the code and the PRD disagree, work stops until one of them changes.** Explicitly, in
a commit, with a reason. Silent drift between what a document promises and what software does is
the most common way a project becomes untrustworthy.

**N6. Nothing ships that someone has not tried to break.** Not reviewed. Tried to break. At tier
1 this can be five minutes of thinking about the worst input.

**N7. Git attribution is the human operator only.** See section 10.

---

## 5. The team

Six roles. One person can hold several, with one hard rule that survives every tier: **no one
holds both Implementer and Reviewer, or both Implementer and Test Author, for the same change.**
That separation is the mechanism. Everything else is scaffolding around it.

### Architect
Decides the approach and writes the ADR. Owns "is this the right shape", not "does this compile".

*Produces:* a decision record with at least two genuine alternatives, the tradeoffs, the choice,
and the reasoning. States explicitly whether the decision is cheap to reverse or a one-way door,
because that determines how much argument it deserves.

### Implementer
Writes the code to the approved approach.

*Produces:* the change, the `implementation.md` update in the same commit, and **a written
statement of what they are least confident about.** That last item is not optional and is often
the most useful thing in the pull request.

*May not:* change the approach mid-build without going back to the ADR. Discovering the approach
was wrong while building it is a finding, and findings get recorded, not absorbed.

### Test Author
Writes tests from the PRD and the ADR, deliberately without reading the implementation first.

*Produces:* tests that fail if the requirement is false, rather than tests that describe what the
code happens to do.

*May not:* weaken a test to make it pass. A failing test is information.

### Reviewer
Did not write the code. Reviews against the PRD and the ADR, not against personal taste.

*Produces:* explicit answers to three questions. Does this do what the ADR said? Does it match
the PRD? What did the implementer say they were unsure about, and is that resolved?

*May not:* approve anything they have not read in full. "Looks good to me" is not a review.

### Adversary
Assumes the code is wrong and looks for the input that proves it. Does not review for style,
completeness or intent.

*Produces:* either a concrete failure with the input and state that triggers it, or a list of
what they tried and why it held. A pass with no attack list is not a pass.

*Attacks in this order:* anything touching money, anything touching auth or permissions, anything
touching user data, anything that talks to the outside world, then everything else.

### Spec Conformance Checker
Compares what the PRD says to what the code does, **in both directions**.

*Produces:* divergences classified as "code is wrong", "PRD is wrong", or "PRD is ambiguous". All
three are findings, and the third is the most common and most dangerous, because it stays
invisible until two people read the same sentence differently.

---

## 6. The loop

```
  1. TODO selected from implementation.md
        |
  2. ARCHITECT writes the ADR          (tier 1: only for one-way doors)
        |
  3. ADVERSARY challenges the ADR      <-- before any code exists
        |  the cheapest place in the whole process to catch a wrong approach
        v
  4. ADR accepted and committed
        |
        +------------------------------+
        |                              |
  5. IMPLEMENTER writes code    5b. TEST AUTHOR writes tests
        |  states what they             |  from the PRD and ADR,
        |  is least sure about          |  without reading the code
        +------------------------------+
        |
  6. Tests run against the implementation
        |  a mismatch is information, not an obstacle
        v
  7. REVIEWER reviews against PRD and ADR
        |
  8. ADVERSARY attacks the implementation
        |
  9. CONFORMANCE CHECK in both directions
        |
 10. Gates green, merge
        |
 11. implementation.md updated in the same commit
```

**Where the loop goes backwards, which it should do often:**

- Step 3 finds a problem, return to step 2. An approach rejected before code exists is a success,
  not a delay. This should be the most common backward step in a healthy project.
- Step 6 mismatch: stop and work out which of the code, the test or the PRD is wrong. Never
  adjust the test to match the code without understanding why they disagree.
- Step 8 finds an attack: add the regression test first, then fix.
- Step 9 finds divergence: fix whichever is wrong. Never quietly change both to meet in the middle.

---

## 7. `implementation.md`

At the repository root. Updated in the same commit as the work it describes, never in a catch-up
pass.

```markdown
# Implementation status: <project>

Last updated: <date> by <who>
PRD version this tracks: <version or commit>
Stakes tier: <1, 2, 3>

## Summary
<Three sentences. What works, what does not, what is next.>

## Component status

| Component | PRD ref | Tier | Status | ADR | Tests | Reviewed by | Adversary |
|---|---|---|---|---|---|---|---|

Status: not started, designed, in progress, in review, done, blocked.
"Done" requires every column filled. Nothing is done because it works locally.

## Open TODOs
<Format in section 8. Every TODO lives here, not in scattered code comments.>

## Known divergences from the PRD

| What | PRD says | Code does | Why | Resolution by |
|---|---|---|---|---|

<Empty is the goal. Non-empty is fine only with a dated resolution. The table existing at
all is what stops silent drift.>

## Decisions log
<One line per ADR: number, title, date, status. Full text in /adr.>

## What we have not proven
<Claims the code makes that no test or measurement backs yet. Read first by anyone deciding
whether to trust this build. Be honest here or the section is worthless.>
```

---

## 8. TODOs

In `implementation.md`. Not in code comments, not in chat, not in someone's head.

```markdown
### TODO-017: <short title>
PRD: <section>
ADR: <number, or none needed>
Status: in progress
Owner: <who>
Blocks: TODO-019

Tasks:
- [ ] <checkable, specific, verifiable by looking>
- [ ] <error case, not just the happy path>
- [ ] <the boundary: empty, maximum, concurrent, unauthorised>

Least confident about: <filled in honestly by the implementer>
```

**Every task is checkable.** "Handle errors properly" is not a task. "Return 409 and leave state
unchanged when two writes target the same row" is.

**A TODO with no tasks has not been thought about.** That is fine, mark it `not started` rather
than pretending.

**Nothing is dropped silently.** A TODO that turns out unnecessary is closed with a reason.

---

## 9. Definition of done

| Gate | Requirement | Tier |
| --- | --- | --- |
| ADR | Exists and the implementation matches it | 1 for one-way doors, 2 and 3 always |
| Tests | Pass, cover every PRD claim the component makes | All |
| Test authorship | Written by someone other than the implementer | 2 and 3 |
| Error paths | Tested, not just happy paths | All |
| Review | Explicit answers to the three questions | All |
| Adversary | Attack list produced, findings fixed, regression tests added | 2 on risky paths, 3 always |
| Conformance | No unresolved code and PRD divergence | 2 and 3 |
| implementation.md | Updated in the same commit | All |
| Clean build | No new warnings, linters pass | All |

**Extra gates for anything touching money, auth, or user data**, regardless of project tier:

- A second independent review by someone who reviewed neither the ADR nor the first pass.
- A written statement of the worst outcome if this component is completely wrong.
- A test proving it fails closed, not open, when inputs are missing or malformed.

---

## 10. Git and GitHub

**Attribution is the human operator only.** No AI co-author trailers, no generated-by footers, no
tool attribution, in commits, pull request titles or bodies, issues, or documentation.

```bash
git config user.name  "<your name>"
git config user.email "<your github email>"

# verify before the first push, and again after the first few commits
git log -1 --format='%an <%ae>%n%b'
```

Any agent working in this repository writes commit messages containing the change and its
reasoning only. If a tool or template appends attribution, remove it before committing. Check
`git log` early, because this is trivial to fix at commit five and painful at commit five hundred.

**Commit messages:**

```
<component>: <what changed, imperative mood>

<why it changed. the reasoning, not a restatement of the diff.>
<ADR reference if one applies.>
```

**Branching.** One branch per TODO, named for it. Merge only through a pull request, only with the
gates for its tier green.

**Pull request body** states: which TODO, which ADR, what the adversary tried, what the
implementer was least sure about, and what remains unproven.

---

## 11. Testing, by what the thing is

| Kind of component | What it needs |
| --- | --- |
| Pure logic, calculations, state machines | Property tests on every invariant. Table-driven tests on boundaries |
| Anything parsing external input | Fuzzing. Malformed, truncated, hostile and empty inputs |
| Anything with permissions | **Access control tests written before the happy path.** Write the test proving an unauthorised caller is rejected, watch it fail, then implement |
| Anything touching money | Full branch coverage. Idempotency tests. Concurrent-execution tests. A test that it fails closed |
| Anything with a schema or wire format | Round-trip property tests. Committed fixtures so a format change is visible in the diff |
| Anything with two implementations | Differential tests driving both from identical generated inputs, asserting identical results |
| UI | The empty state, the error state, the loading state, and the too-much-data state. These are where PRDs are silent and users live |
| Integrations | Tests against the dependency being down, slow, and returning something unexpected |

---

## 12. The trap list

Start it empty. Add one line every time something bites, and never remove a line.

```markdown
| Trap | The rule |
|---|---|
| <what went wrong, once> | <the rule that stops it recurring> |
```

This is the highest-value file in a long-running project and the one most often not kept. A bug
that recurs is a bug nobody wrote down. Read this file at the start of every work session.

---

## 13. What this buys, and what it costs

It does not guarantee correctness. No process does, and a document claiming otherwise would be
the first thing in it to distrust.

What it buys is specific. Wrong approaches get caught at the ADR stage, where they cost an hour
instead of a month. Tests written from the requirement catch misunderstandings that tests written
from the code cannot see, because the second kind inherits the misunderstanding. An adversary who
assumes the code is wrong finds things a reviewer checking for correctness will not. And a
conformance check running in both directions stops the slow drift between what the documentation
promises and what the software does, which is how a codebase becomes something nobody trusts.

The cost is roughly two to three times the wall-clock time of writing code and merging it, at
tier 3. Considerably less at tier 1, which is the point of having tiers.

The trade is correct at tier 3 and wrong at tier 1, so **pick the tier honestly**. Process applied
uniformly is process that gets ignored, and a rule that gets ignored is worse than no rule,
because it teaches everyone that the rules are decorative.
