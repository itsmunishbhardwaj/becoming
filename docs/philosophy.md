# Life Operating System (Life OS)

> **Vision:** Build a visual operating system for a person's life—not a productivity app, habit tracker, or calendar.

---

# Core Philosophy

Most productivity tools organize life by **time**.

```
2026

January
February
March
April
...
```

This is backwards.

Life is not lived in months.

Life is lived in pursuit of becoming someone.

The application should organize life by **purpose**, with time acting only as one way to visualize progress.

The software should answer one fundamental question:

> **"Am I becoming the person I want to become?"**

Everything else is secondary.

The calendar is not the product.

The calendar is simply one visualization of a much larger system.

---

# Mental Model

Instead of:

```
Calendar
    ↓
Activities
    ↓
Goals
```

The architecture should be:

```
Life
    ↓
Identity
    ↓
Goals
    ↓
Projects
    ↓
Activities
    ↓
Calendar (Visualization)
```

The calendar exists to show **when progress happened**, not to organize life.

---

# Guiding Design Principles

## 1. Goals are the Primary Object

Goals are permanent.

Everything else exists to support them.

Examples:

- Become a Google Engineer
- Build an AI Startup
- Become Financially Independent
- Build Meaningful Relationships
- Become Healthy
- Read 50 Books
- Create Great Art
- Become an Exceptional Public Speaker

These are not tasks.

These are long-term identities.

---

## 2. Projects Support Goals

Every goal contains projects.

Example:

Become Google Engineer

- Resume
- Networking
- System Design
- Leetcode
- Behavioral Interviews
- Mock Interviews

---

## 3. Activities Support Projects

Every activity contributes to one or more projects.

Examples:

- Solved 3 Leetcode problems
- Read System Design chapter
- Sent recruiter message
- Mock interview

Activities should automatically contribute to:

Activity

↓

Project

↓

Goal

without requiring manual assignment whenever possible.

---

## 4. Calendar is Just One View

The calendar should never be the primary interface.

Instead it should answer questions like:

- When did I make progress?
- What periods of my life were focused on Health?
- When did I stop working on my startup?
- Which months were heavily focused on learning?

---

# User Experience

## Home Screen

The application should not open into a calendar.

Instead it should open into Life.

Example:

```
Life OS

━━━━━━━━━━━━━━━━━━━━━━

Become Google Engineer

██████████░░░░░

74%

Last worked:
Yesterday

━━━━━━━━━━━━━━━━━━━━━━

Build AI Startup

██████░░░░░░░

42%

Last worked:
Today

━━━━━━━━━━━━━━━━━━━━━━

Health

████████░░░░

68%

Gym yesterday

━━━━━━━━━━━━━━━━━━━━━━

Relationships

███████░░░░

53%

Called parents today

━━━━━━━━━━━━━━━━━━━━━━
```

The user should immediately understand:

- what matters
- where momentum exists
- what is being neglected

---

# Goal Page

Clicking a goal opens a dedicated workspace.

Example:

```
Become Google Engineer

Mission

Get hired by Google.

━━━━━━━━━━━━━━━━━━━━━━

Projects

✔ Resume

✔ Networking

✔ Leetcode

✔ System Design

✔ Behavioral

━━━━━━━━━━━━━━━━━━━━━━

Progress

━━━━━━━━━━━━━━━━━━━━━━

Calendar

━━━━━━━━━━━━━━━━━━━━━━

Insights

━━━━━━━━━━━━━━━━━━━━━━

Journal
```

Everything related to the goal lives here.

---

# Calendar Visualization

The calendar is not for scheduling.

It is a visual history of progress.

Each day becomes a visual representation of everything accomplished.

---

## Year View

Each day is represented by translucent overlapping circles.

Each category has a consistent color.

Example:

Blue = AI

Green = Health

Orange = Relationships

Purple = Reading

Red = Career

Yellow = Creativity

Circle size represents effort.

Transparency allows overlaps.

One day might look like:

```
      🔵

  🟢🟢🟣

🔵🟠🟠
```

No text.

Just patterns.

The goal is to recognize years at a glance.

---

## Zoom Philosophy

The interface should behave like Google Maps.

Not like Google Calendar.

Zooming should reveal increasing levels of detail.

Example:

Entire Life

↓

Years

↓

Months

↓

Weeks

↓

Days

↓

Activities

↓

Journal Entries

Nothing should switch pages.

Everything should smoothly transform.

---

# Visual Language

The interface should feel:

- calm
- premium
- modern
- elegant
- spacious

Think:

- Apple Health
- Arc Browser
- Linear
- Figma
- Google Maps

Avoid:

- cluttered dashboards
- dense tables
- spreadsheet interfaces
- excessive menus

---

# Motion Design

Nothing should suddenly appear.

Everything should morph naturally.

Example:

Tiny dot

↓

Colored circle

↓

Larger blob

↓

Activity labels

↓

Journal

Animations should communicate understanding, not decoration.

---

# Data Model

The system should build a knowledge graph.

Goals

↓

Projects

↓

Activities

↓

Journal

↓

People

↓

Places

↓

Skills

↓

Habits

↓

Reflections

↓

AI Insights

Everything is connected.

Nothing should exist in isolation.

---

# AI First

This is not a form-filling application.

The primary interaction should be natural language.

Instead of asking:

- Category?
- Tags?
- Duration?
- Goal?
- Priority?

The user simply writes:

> Today I spent four hours building my AI agent, went to the gym, called my parents, read twenty pages, and recorded a YouTube video.

The AI extracts:

Activities

Projects

Goals

Duration

People

Skills

Notes

Relationships

without asking additional questions whenever possible.

---

# Automatic Progress Inference

The user should rarely assign activities manually.

Example:

```
Solved 3 Leetcode problems.
```

The system understands:

Activity

↓

Coding Practice

↓

Interview Preparation

↓

Become Google Engineer

without requiring configuration.

---

# Goals are Living Objects

Every goal should maintain:

Mission

Why it exists

Projects

Milestones

Activities

Journal

Momentum

Streaks

AI observations

Timeline

Related goals

Related people

Related skills

Blockers

Reflections

Goals should feel alive.

---

# Seasons

Goals are never simply "active" or "abandoned."

Life moves in seasons.

A goal can be:

- **Active** — currently being pursued
- **Dormant** — intentionally paused
- **Completed** — achieved
- **Retired** — no longer part of who the user wants to become

Dormant is not failure.

Pausing a goal to focus elsewhere is a strategic decision, not neglect.

The interface should never guilt the user for an intentional pause.

Example:

```
Build AI Startup

🌙 Dormant since March

"Paused to focus on Google interviews.
Returning in summer."
```

Dormant goals:

- Do not appear as "neglected"
- Do not decay visually
- Do not generate warnings
- Preserve all history and momentum context

When the user returns, the goal wakes up exactly where it was left.

The system should distinguish:

- **Drift** — unintentional neglect (surface gently)
- **Dormancy** — intentional pause (respect silently)

Identity shifts are data, not failures.

"You stopped pursuing X in March" is more valuable insight than any progress bar.

---

# AI Chief of Staff

The AI should act like a personal strategist.

Instead of dashboards, surface observations like:

"You haven't worked on your startup in twelve days."

"Interview preparation has slowed significantly over the past month."

These insights should feel thoughtful rather than analytical.

## Questions Over Declarations

The AI observes patterns from limited, noisy, self-reported data.

Correlations may be spurious.

Therefore:

Declare only what is certain (facts from the log).

Ask about everything else (inferred patterns).

Instead of:

> "You consistently perform your best coding sessions after gym workouts."

Say:

> "I've noticed your coding sessions seem stronger after gym days. Does that match your experience?"

Instead of:

> "Your creative work mostly happens late at night."

Say:

> "Most of your creative entries are logged late at night. Is that when you do your best creative work, or just when you log it?"

Rules:

- Facts → stated plainly ("12 days since last startup activity")
- Patterns → framed as questions
- User confirmation strengthens the insight; rejection discards it
- Confirmed patterns become part of the knowledge graph

A wrong insight stated confidently destroys trust.

A wrong insight framed as a question starts a conversation.

---

# Search

Everything should be searchable using natural language.

Examples:

Show every day I worked on AI.

Show all progress toward Google.

Show every workout before an interview.

When did I last call my parents?

Show months where Health and AI overlapped.

---

# Future Capabilities

The architecture should support future additions without redesign.

Potential features include:

- Voice logging
- Mobile companion
- Apple Health integration
- GitHub integration
- Google Calendar sync
- Financial tracking
- Relationship timelines
- Travel history
- Photo memories
- AI weekly reviews
- AI yearly reviews
- Goal forecasting
- Agentic planning
- Automatic project generation
- Habit detection
- Burnout prediction

Everything should build on the same underlying graph.

---

# Technical Philosophy

Do not build:

- a calendar application
- a habit tracker
- a task manager
- a journaling app

Instead build:

A Life Operating System.

The calendar is one visualization.

Goals are the foundation.

Everything else emerges naturally from the underlying knowledge graph.

---

# Success Metric

The application succeeds when a user can open it and immediately answer questions like:

- Who am I becoming?
- Which goals are gaining momentum?
- Which goals have been neglected?
- How has my life changed over the past year?
- What patterns exist in my behavior?
- What should I focus on next?

without reading tables, charts, or dashboards.

---

# North Star

Every design decision should answer one question:

> **Does this help the user understand who they are becoming?**

If the answer is no, it probably does not belong in the product.