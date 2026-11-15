# Becoming — Screens Plan v2 (changes)

> Read after `claude/screens-plan.md` (v1). Where this document and v1 disagree, **this document wins**.
> Read `philosophy.md` first. It was updated alongside this file and is the source of truth for principles.

---

## 1. Tabs and screens

The top bar holds these tabs, in this order:

| Tab | Route | Job |
|---|---|---|
| **Year** (home) | `/` | Whole year at a glance. Marks, goal streaks, goal percentages. |
| **Goals** | `/goals`, `/goals/:goalId` | Add, edit, pause, retire, delete goals. Everything about one goal. |
| **Journal** | `/journal` | Dedicated logging page. Free text, reflection prompts, dated entries. |
| **To-do** | `/todo`, `/todo/:date` | Today's goal items and own tasks, with checkboxes. |
| **Insights** | `/insights` | Statistics plus AI observations. |
| **Coach Carter** | `/coach-carter` | Goal planning and **contracts**. |

Six tabs. Shell rules from v1 still apply: burger left, logo, tabs, Ask bar, profile right. The drawer holds Today and Goals, as in v1.

Contracts live **only** on the Coach Carter page. v1's "contract placeholder" on the goal create sheet and goal page is now a **link** to the Coach Carter page, shown only when the goal has a contract. The goal page never creates or holds one.

---

## 2. Logging anywhere

Any screen can log. The rules are the same everywhere:

- **Mark a goal** — from the year cell, the drawer's Today list, the to-do checkbox, the goal page, or the day panel. Writes one mark for that goal and that date.
- **Journal entry** — from the Journal page (general), or from a goal page (already tagged to that goal), or from the day panel (dated to that day).
- **Own task** — from the To-do page only. It can be created on any date.

Ask bar (top bar): in v2 it can also start a journal entry. "Log or ask anything" with `Enter` opening the Journal page with the text pre-filled.

---

## 3. Journal screen — `/journal`

Layout: a composer at the top, then a reverse-chronological list of entries.

### Composer

- Large text area. Placeholder: "What happened?"
- Date field, defaults to today. Editable, so a past date can be picked (yesterday's test result).
- Optional **prompt** chip row: `Highlight of the day`, `Something to remember`, `No prompt`. Picking one puts the question above the text area as a label, not a locked form.
- Optional **goal tags** under the text area: multi-select of active goals. Tagged goals show the entry on their goal page.
- `Save` button. `⌘/Ctrl + Enter` saves. Autosave draft every 800ms idle, kept until saved.

### Entry list

- Each entry: date, prompt label if any, goal chips, text (first ~3 lines, expand on click).
- Filter bar: date range, goal, prompt. Search box uses the Ask-style natural language search from `philosophy.md`.
- Editing an entry keeps `createdAt` and sets `editedAt`. Show "edited" under the text.

### Goal-specific logging

On a goal page, the Journal section is a composer already tagged to that goal, followed by that goal's entries only.

---

## 4. To-do screen — `/todo`

Defaults to today. Date switcher with `‹ ›` and a `Today` button. Past days are read-only except for checkboxes, which can still be corrected.

### Layout

Two sections on one page, separated by a divider:

**Goals for today**
- Every active goal appears each day by default. The user can hide a goal for the day (dismiss icon), but it returns the next day.
- Each row: checkbox, goal colour dot, identity statement (Fraunces, 16px), effort toggle, note preview.
- Checking the box creates the mark for that goal and date. **Unchecking deletes the mark**, after an inline confirm if the mark has a note or effort set.
- Goals already marked elsewhere (year cell, drawer) appear checked on load.

**Own tasks**
- Text input at the top: "Add a task for today…". `Enter` adds it.
- Each task: checkbox, title, optional due time (not required), optional link to one goal.
- Checking a task marks it done and appends a row to the **task log** (see below).
- Drag to reorder. Order is per day.
- Tasks are not marks. They never count toward streaks or percentages, unless the user links them to a goal, and even then only the link is shown on the goal page.

### Task log

- Below the lists, a collapsed **Done on this day** section.
- Shows completed own tasks with their time of completion.
- Separate from journal entries. Never merged into the journal list.

### Rules

- Checkbox state is the single source of truth for marks. The drawer, year view, and goal page read from the same mark record.
- Empty day: a calm card, "Nothing on the list. Add a goal or a task, or just log something in the journal." Not a warning.
- Carried-forward tasks: a task left unchecked from a previous day is offered once, as "Carry to today". It is never shown as overdue, and it never turns red.

---

## 5. Year screen — changes

- **Goal cards** replace v1's goal chips. Each goal shows:
  - Current streak and longest streak, both numbers together, always.
  - Days marked, and if the goal has a target: "X of Y days, Z%".
  - The 8-week density strip stays.
- Streak copy when broken: "Streak ended 3 Nov. Longest: 41 days." No red.
- Goal percentage ring is a thin ring in the goal colour, capped at full, with the true number in text.
- Mark cells and popovers are unchanged from v1.

---

## 6. Goals screen — changes

- **Target** field in create/edit: "Days in the year to aim for" (number, default blank). Blank means no percentage shown.
- Goal page header shows current streak and longest streak, plus target percentage if set.
- The goal page **Journal** section is the goal-tagged composer described in section 3.
- The goal page **Contract** section is a single link to `/coach-carter?goal=:goalId` if a contract exists. If not, nothing is shown. No "coming soon" card.
- The contract reserved field in the data model is `contractId`. Keep `null` in v2.

---

## 7. Insights screen — changes

Facts layer gains:

- **Streaks per goal**: current and longest, shown together, as a pair of numbers per goal row.
- **Percentage of target per goal**, with "X of Y days". Goals without a target show days marked only.
- **Where I faltered**: quiet stretches (v1) plus a line per goal: "Longest run: 41 days, 3 Jan – 12 Feb. Ended: 13 Feb."
- **How long I have followed a goal**: first mark date to today, plus days marked over that span.

Observations layer is unchanged from v1 (fact stated plainly; pattern asked as a question; yes / no / unsure).

---

## 8. Coach Carter screen — `/coach-carter`

### Goal picker

At top: choose an active goal, or start a new change.

### Plan area

Placeholder for the Coach Carter pipeline (Intake → Classify → Baseline → Gap → Ramp → Ratify → Execute/Gate → Adapt). Not wired in v2. Shows "Plan not built yet" in plain copy.

### Contracts section

List of contracts, newest first, each linked to its goal.

`Sign a contract` button creates a contract for the selected goal.

---

### Contract design — the document

A contract is a **full-page document** styled to look and feel like an official legal contract. It is not an official contract. It is a UI decorator — a ceremony that makes a personal commitment feel weighty and real.

#### Layout

The contract renders as a single scrollable page, vertically centred, with generous margins — like a printed legal document, not a web form.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              BECOMING                            │
│              ────────                            │
│                                                  │
│         CONTRACT OF PERSONAL COMMITMENT          │
│                                                  │
│  Date of execution: 15 November 2026             │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  BETWEEN:                                        │
│                                                  │
│  [User's name], hereinafter referred to as        │
│  "the Undersigned"                               │
│                                                  │
│  AND:                                            │
│                                                  │
│  The Undersigned's future self, hereinafter       │
│  referred to as "the Intended"                   │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  WHEREAS the Undersigned has declared the         │
│  intention to become:                            │
│                                                  │
│    "[Identity statement from the goal]"           │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ARTICLE I — THE COMMITMENT                      │
│                                                  │
│  The Undersigned hereby commits to the            │
│  following change:                               │
│                                                  │
│    "I will [action] by [date]."                  │
│                                                  │
│  (User-editable text field in this format)        │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ARTICLE II — THE TERMS                          │
│                                                  │
│  The Undersigned agrees to the following terms    │
│  and conditions:                                 │
│                                                  │
│    [User-written terms — free text area]          │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ARTICLE III — ACKNOWLEDGMENT                    │
│                                                  │
│  The Undersigned acknowledges that this            │
│  commitment is made freely, without coercion,     │
│  and with full understanding that the only        │
│  party who can hold them to it is themselves.     │
│                                                  │
│  The Undersigned further acknowledges that        │
│  failure to honour this commitment carries no     │
│  penalty other than the knowledge that they       │
│  did not do what they said they would do.         │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  IN WITNESS WHEREOF, the Undersigned has          │
│  executed this Contract of Personal Commitment    │
│  on the date first written above.                │
│                                                  │
│                                                  │
│  Signature: ____________________________          │
│                                                  │
│  Print name: [User's name]                       │
│  Date: [Auto-filled]                             │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│               [Becoming logo mark]               │
│          "You said you would. Now do it."         │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Typography and styling

- **Header**: "BECOMING" in Fraunces, all caps, tracked wide. Below it, a thin horizontal rule.
- **Title**: "CONTRACT OF PERSONAL COMMITMENT" in Inter, all caps, 14px, letter-spacing 2px.
- **Body text**: Inter, 14px, line-height 1.7. Formal legal language throughout.
- **Quoted text** (identity statement, commitment, terms): Fraunces italic, 16px, indented, in the goal's colour.
- **Section dividers**: thin horizontal rules between articles.
- **Signature line**: a hand-drawn-style underline (SVG or CSS), not a plain border. Below it, "Print name" and "Date" in 12px Inter.
- **Footer**: Becoming logo mark (small), centred, with the tagline in Inter italic, 12px.
- **Page background**: the warm paper colour from the app's theme, with grain. The contract should feel printed on good paper.
- **No red anywhere.** Consistent with the full app palette.
- **Print stylesheet**: `@media print` hides the app shell, sets white background, ensures the contract fills one physical page. The "Print this contract" button lives above the document and hides on print.

#### Signing flow

1. User fills in the commitment ("I will [action] by [date]") and the terms (free text).
2. User clicks "Sign this contract."
3. A signature area appears: a canvas where the user draws their signature with mouse or finger. Touch-optimised for mobile.
4. On confirm, `signedAt` is set. The signature is stored as an SVG path in the contract record.
5. The document becomes read-only. The signature renders where the line was.
6. A signed contract can be viewed and printed but not edited. To change the terms, the user retires the old contract and signs a new one.

#### Commitment format

The commitment field is guided, not free-form:

```
I will _______________
by _______________
```

Two fields: the action and the date. Stored as a single `change` string: "I will [action] by [date]." The UI renders both fields into the legal sentence.

#### Print

A "Print this contract" button appears above the document (both signed and unsigned). It triggers `window.print()`. The print stylesheet ensures:

- App shell, nav, and button are hidden
- The contract fills one page
- Background colour and grain print (use `-webkit-print-color-adjust: exact`)
- The signature renders in print

#### Data

```ts
type Contract = {
  id: string;
  goalId: string;
  change: string;              // "I will [action] by [date]."
  terms: string;               // free text written by the user
  signatureSvg: string | null; // SVG path data of the drawn signature
  signedAt: string | null;     // ISO timestamp, set on sign
  retiredAt: string | null;    // ISO timestamp, set when replaced
  createdAt: string;
};
```

Functions to add:

- `getContract(id)` — single contract with full detail
- `retireContract(id)` — sets `retiredAt`, frees the goal for a new contract

---

## 9. Motion and performance

Unchanged from v1 section 8. Additional note:

- Journal list and To-do list must not re-render when a checkbox changes elsewhere. Memoise rows.
- Checkbox toggles are optimistic. The mark or task row changes in the same frame; the save happens after.

---

## 10. Data model changes

```ts
type Goal = /* v1 fields, plus */ {
  target: number | null;   // days in the period to aim for; null = no percentage
};

type JournalEntry = {
  id: string;
  date: string;             // YYYY-MM-DD, can be any date
  text: string;
  prompt: 'highlight' | 'remember' | null;
  goalIds: string[];        // zero or more
  createdAt: string;
  editedAt: string | null;
};

type Task = {
  id: string;
  title: string;
  date: string;             // the day it is on the list
  order: number;
  done: boolean;
  doneAt: string | null;    // set when checked; feeds the task log
  dueTime: string | null;
  goalId: string | null;    // optional link, does not count as a mark
  carriedFrom: string | null;
};

type Contract = {
  id: string;
  goalId: string;
  change: string;              // "I will [action] by [date]."
  terms: string;               // free text written by the user
  signatureSvg: string | null; // SVG path data of the drawn signature
  signedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
};

// Mark (from v1) is unchanged. A goal item checkbox creates or deletes a Mark.
```

Functions to add to `src/data/client.js`:

`listJournal({from, to, goalId?, prompt?})`, `saveJournal(entry)`, `deleteJournal(id)`, `listTasks(date)`, `addTask(date, title, goalId?)`, `setTaskDone(id, done)`, `reorderTasks(date, ids)`, `carryTask(id, toDate)`, `listTaskLog(date)`, `getStreaks(goalId)` (returns `{current, longest, longestFrom, longestTo}`), `getProgress(goalId, period)` (returns `{marked, target, percent}`), `listContracts()`, `getContract(id)`, `saveContract(contract)`, `retireContract(id)`.

Streak rules are computed in the data layer, not in components, so the logic is in one place. Use the rules in `philosophy.md` → "Streaks".

---

## 11. Build order changes

Insert the following into v1's build order, after milestone 4 (Marking):

- **4b. Streak and progress functions** with unit tests for: current streak through an unmarked today, a break at midnight, a longest run that survives a break, a goal with no target.
- **5b. To-do screen** — goal items (every active goal shown daily, per-day hide), own tasks, checkbox sync with marks in both directions (uncheck = delete mark after confirm), task log. *Done when:* checking a goal item shows the mark on the year view and unchecking it removes it, from either side.
- **5c. Journal screen** — composer with date, prompt, goal tags; entry list; goal-tagged composer on goal pages. *Done when:* an entry dated yesterday appears on yesterday in the list and on its tagged goal.

Coach Carter screen and contracts go after Insights (v1 milestone 8):

- **8b. Coach Carter screen** — goal picker, plan placeholder, contracts list, "Sign a contract" flow with the full legal-document UI, signature canvas, print stylesheet. *Done when:* a user can sign a contract, see it rendered as a legal document, and print it.

---

## 12. Resolved decisions

All open decisions from the original v2 plan have been resolved:

| Decision | Resolution |
|---|---|
| **A. Six tabs** | Confirmed. Six on desktop. Mobile: bottom bar with Year, Goals, Journal, To-do, Insights, Coach Carter under "More". |
| **B. Streaks vs mastery-track.md** | Resolved. `mastery-track.md` updated to allow current + longest streaks alongside density. No conflict. |
| **C. Percentage** | Confirmed. Optional target in days. Percentage = days marked ÷ target. No target = no percentage. |
| **D. Unchecking a goal item** | Confirmed. Unchecking deletes the mark. Inline confirm if the mark has a note or effort set. |
| **E. Default goal list on To-do** | Confirmed. Every active goal appears each day. User can hide per day; it returns the next day. |
| **F. Contract design** | Designed. Full legal-document UI with header, articles, signature canvas, print support. See section 8. |

No open decisions remain.
