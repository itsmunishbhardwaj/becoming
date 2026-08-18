# Lessons

## Never delete a prior plan when adding a new one

**2026-08-18** — User asked for a second feature plan. I created a new branch off main and edited todo.md to remove the earlier feature plan, thinking "one branch = one plan." User was angry: they wanted both plans preserved as separate to-do items, regardless of branching.

**Rule:** `tasks/todo.md` is append-only for plans. Adding a new feature = adding a new section. Never remove or overwrite an existing plan section, even when creating a new branch. If a plan is obsolete, the user will say so — don't infer.

**How to apply:** When user says "create another plan" / "new plan" / "add a plan," always `Edit` by appending. Only remove content when explicitly told to delete or when the user marks a plan complete.

## Never kill a dev server the user might still be using

**2026-08-18** — Started `npm run dev` in the background for QA of the notes feature. Verified the flow, then ran `pkill -f vite` as "cleanup" before proposing a commit. User was still working with the app and hit a dead port. Killing it was unrequested and unhelpful.

**Rule:** Do not kill long-running dev servers, watchers, or preview processes I started for verification. The user drives when they're done.

**How to apply:** After finishing my QA, leave the dev server running. If it truly needs to be stopped (port conflict, restart to pick up config change), ask first. Same rule for any background process the user might interact with.
