# Origin: the two spreadsheets

This document is empirical ground truth for Becoming. It distills the two real
spreadsheets that precede this app — what they got right, where they failed, and
what each failure demands from our design. When a product decision is ambiguous,
come back here: the app must do what these sheets did for Munish, minus the
reasons he stopped using them.

Sources:

- **"Goals 2024"** — hand-built by Munish. 7 tabs: Template, Hobbies, Health,
  Professional, Shopping, Travel, Financial.
- **"Goals 2025"** — purchased template (The Weekly Crew, Etsy). Habit Tracker
  (duplicated per month: Jan–June), Goal Tracker with Areas of Life.

---

## Sheet 1 — "Goals 2024" (the original invention)

Each life category got its own tab. Every tab had the same anatomy:

1. **Ambition** — up to 5 goals for the year, written in his own voice:
   "I gotta read 5 BOOKS for cying out louudd!!", "Spend time learning the
   KEYBOARD you bought with your money idiot!", "182 hours of cardio (1
   hour/day) OR 260 laps of the pool (10 laps/day) whichever comes first."
2. **Result** — a year-end retrospective column, brutally honest:
   "didnt achive any health goals", "Got a job offer in Dubai and blew it BIG
   TIME!", "16 lpa increment (2 lacs less), investments are now 35000 p.m which
   is 84% jump!"
3. **Goal Division** — the year split into thirds (T1–T4 rows) with explicit
   sub-targets per period: "30 days of driving", "36 hours OR 60 laps",
   "Tuesdays with Morrie & Masala lab". His stated intent, verbatim: divide
   goals across the year "in a such a way that we know EXACTLY how much work
   need to be done in each third."
4. **Twelve mini month-calendars** — arranged in the T1–T4 rows. Progress was
   recorded by marking the day: coloring a date cell or typing over it
   ("swim", "Swim" replacing the 18th, 20th, 26th...). Monthly plans were
   bullet notes beside the grids: "• Read Masala Lab at the office",
   "• Watch 3 satyajit movies this month".

### What it got right (this is the soul of the app)

- **The calendar is a history, not a schedule.** He never planned days. He
  marked days *after* progress happened, to see when he achieved what. That is
  exactly our "calendar as visualization of progress" principle — it existed in
  the 2024 sheet before the philosophy doc did.
- **Goals grouped by identity area, not time.** Tabs were purposes, months
  were embedded inside them. Time lived *inside* purpose.
- **Goals in his own emotional voice.** The ambitions read like self-talk, not
  SMART-goal corporate-speak. Capture must preserve the user's phrasing.
- **Quantified ambitions with flexible framing.** "182 hours OR 260 laps,
  whichever comes first" — goals had alternates and equivalences, not one
  rigid metric.
- **Period sub-targets, not daily streaks.** T1–T4 division is a milestone
  cadence: "this third of the year, this much." Far gentler and more realistic
  than daily-chain thinking.
- **The Result column.** An honest closing reflection per goal, including
  failures, recorded without drama. This is the "retired/completed
  retrospective" of our Seasons model.
- **A marked day carried a note.** "swim" on the 20th is an *activity* — date,
  goal, and what happened, in one gesture. That is our activity object in
  embryo.

### Where it failed (each failure is a requirement)

- **Marking was manual archaeology.** To log a swim he had to open the file,
  find the Health tab, find the right month grid, find the cell, color it.
  → AI-first capture: one sentence in, the system files it.
- **No aggregation across categories.** Seven tabs, no single view of life.
  → Home opens into Life: all goals, momentum visible at once.
- **Empty tabs shame silently.** Shopping was never filled; Health's grids sat
  blank after a few swim marks; T1 was empty because he started late.
  → Seasons: blankness must read as dormancy or drift handled gently — never
  as a wall of un-colored cells.
- **No momentum signal.** A colored cell is binary and flat; he couldn't see
  slowing down or speeding up.
  → Orbs, momentum bars, accumulation framing.
- **Color was the only encoding and it was lossy.** Category color = identity
  is right (we keep this — tokens are law), but effort, duration, and note all
  crammed into one cell.
  → Translucent circles: color = category, size = effort, overlap = rich days.

---

## Sheet 2 — "Goals 2025" (the purchased template)

Two instruments:

**Habit Tracker** (one tab per month, duplicated by hand): up to 30 daily
habits × checkbox-per-day grid, per-day progress bars, per-habit percentage,
"Top 10 Most Consistent Habits" ranking, weekly habits (5 weeks × 15 slots),
monthly habits, and a daily summary. One genuinely great mechanic: **custom
goal denominators** — he set gym to 18 days/month, so 16 gym visits scored 89%,
not 52%. Rest days were built into the definition of success.

**Goal Tracker**: goals as cards. Each card: title banner, Area of Life
(💰 Finances, 💼 Career, 📈 Personal Growth, ❤️ Health, 📱 Materialistic,
✈️ Travel), status (✕ Not Started / ○ In Progress / ✓ Achieved), deadline, a
**reward line**, up to 8 milestone checkboxes, and a progress %. Rollups:
goals achieved per area, overall x/y, top priorities.

### His actual 2025 data (read it as a usage study)

- Nov 2024 trial: 17.8% overall. "Make the bed" 0/30 all month.
- **Jan 2025: 44.1%** — Eat healthy 31/31 (100%), Hit the gym 16/18 (89%),
  Wake at 7:30 2/31 (6%), Sleep at 11pm 0/31 (0%).
- **June 2025: 6.0%** — grid nearly all FALSE. Habits by then: Hit the gym
  6/18, Track diet on MyFitnessPal 2/30, "Eat Junk" (a *negative* habit he
  added), SLEEP AT 11:00 PM in frustrated all-caps at 0%, DSA 0%, MCP 0%,
  Data Science 0%.
- Goal Tracker 2025: 2/9 achieved. Achieved: build a PC (6 milestones all
  checked), **buy a house** ("Find a house → Downpayment → Loan → Registry",
  reward: "I will get to live in it"). In progress: 24-week gym streak (24
  weekly milestones, 1 checked: "2/4 days"), health insurance (reward: "My
  reward is that I will have one less thing to worry about"; milestone "Reach
  out to Ditto"). Not started: Kubernetes cert, Terraform cert.
- Reward lines are personal and vivid: "Delhi ki sadkon ka lazeez khaana."

### What it got right (steal these)

- **Milestones under goals** — the checklist that carried "buy a house" to
  completion is our Projects layer, proven to work for him.
- **Reward attached to a goal.** Cheap to capture, emotionally real. Worth a
  field on the goal object.
- **Custom denominators / cadence.** Success defined per-goal (18 gym days,
  "2/4 days" weeks), not imposed daily.
- **Areas-of-life rollups** — per-area progress mirrors our category structure.
- **Status vocabulary** on every goal card — a crude ancestor of Seasons.

### Where it failed (the decay curve is the evidence)

- **44.1% → 6.0% in five months.** The tool itself trained him to quit:
  every open showed a wall of FALSE checkboxes and damning percentages.
  Percentage-of-days framing means almost every number the user sees is an
  indictment. → **Accumulation framing is non-negotiable.** 16 gym sessions
  is 16 sessions earned, not 89% of a quota; 2 morning wake-ups is 2, not 6%.
  Count up. Never show the missing days as the headline.
- **Zero-percent rows haunted every month.** "Sleep at 11:00 pm — 0%" was
  copied forward, month after month, in increasingly frustrated capitals.
  → Drift must be surfaced gently as a question ("Sleep goal has been quiet
  since January — still part of the plan, or retire it?"), never re-displayed
  as a standing 0%.
- **Manual duplication ritual.** Each month: duplicate tab, reset checkboxes,
  re-enter habits. Friction compounded the guilt. → Continuity is automatic;
  time rolls forward under the goals.
- **Habits and goals lived in separate systems.** The gym *habit* (Jan, 89%)
  and the gym-streak *goal* (1/24 milestones) never fed each other. → One
  graph: an activity counts toward everything it touches, automatically.
- **Binary days.** A checkbox can't hold "swam 12 laps" or "drove 40 minutes
  in traffic." → Activities carry magnitude and notes; the day view renders
  them with size and depth.
- **He tracked a negative ("Eat Junk").** The system must support
  avoid-behaviors without inverting into shame mechanics — log it as data,
  frame insight as a question, no red, no streak-breaking.

---

## The synthesis Becoming must deliver

The 2024 sheet is the *vision*: life organized by purpose, with a calendar
that answers "when did I make progress toward who I'm becoming?" The 2025
sheet is the *mechanics*: milestones, statuses, cadences, rollups, rewards.
Both died the same death: manual capture friction plus guilt-rendering of
absence.

Concrete obligations this history places on the product, beyond what
`philosophy.md` already states:

1. **A goal's year view.** The T1–T4 layout — one goal, twelve months of
   marked days, period sub-targets — was the view he invented first. Becoming
   should offer it per goal: the goal's own timeline of marked days and
   period milestones, zoomable per the Maps model.
2. **Period targets on goals.** Support dividing a goal into period
   sub-targets (thirds, quarters, arbitrary spans) with their own gentle
   check-ins. Cadence is per-goal, never globally daily.
3. **Result / retrospective field.** When a goal completes or retires, prompt
   one honest closing reflection and keep it with the goal's history. His
   Result column proves he will write these unprompted.
4. **Reward field on goals.** Optional single line, user's own words,
   resurfaced at completion.
5. **Custom denominators everywhere counting exists** — and render counts as
   accumulation ("16 sessions"), with the target as quiet context, not as an
   unfilled remainder.
6. **Negative/avoid behaviors** are loggable data with question-framed
   insights, exempt from any achievement rendering.
7. **Capture must be cheaper than coloring a cell.** That was the bar he
   abandoned. One natural-language sentence — "swam 10 laps, read 20 pages of
   Jugaad" — must file everything: activities, goals, days, magnitudes.
8. **Preserve the user's voice.** Ambitions, results, and rewards are stored
   and displayed as written — "I gotta read 5 BOOKS" — not normalized into
   productivity-speak. The sheets stayed alive as long as they did partly
   because they sounded like him.

The success test, restated in the sheets' terms: December 2026, Munish opens
Becoming and gets what the Result column gave him — an honest, visible account
of when he became what — without ever having had to color a cell.
