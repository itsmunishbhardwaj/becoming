import {
  Component, inject, signal, effect, ViewChild, ElementRef, OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { LlmService } from '../services/llm.service';
import {
  initialState, applyInput, nextTurn, finalize, validate, TURNS,
  type OnboardState, type TurnId,
} from '../core/onboard/turns';
import { runTurn, scriptedTurn } from '../core/onboard/prompting';

const DRAFT_KEY = 'becoming.onboard.draft';

type Bubble = { role: string; text: string };

function loadDraft(): { state: OnboardState; transcript: Bubble[] } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.state || !Array.isArray(parsed.transcript)) return null;
    return parsed;
  } catch { return null; }
}

function saveDraft(state: OnboardState, transcript: Bubble[]): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ state, transcript })); } catch {}
}

function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

const PROMPTS: Record<string, string | ((a: Record<string, unknown>) => string)> = {
  ambition:      'Say the goal in your own words — I\'ll shape a way there.',
  type:          'Is this a wake-time goal or a cadence goal?',
  baseline:      (a) => a['type'] === 'cadence' ? 'How often, roughly, right now?' : 'What time do you actually wake up now?',
  target:        (a) => a['type'] === 'cadence' ? 'Where do you want to land — every how many days?' : 'What time do you want to wake up?',
  endDate:       'By when feels doable?',
  roundsPreview: 'Here are the proposed rounds — accept, or ask to soften?',
  indicators:    'Draft indicators drawn — accept, or edit?',
  confirm:       'Ready to lock this in?',
};

function promptFor(turnId: string, answers: Record<string, unknown>): string {
  const p = PROMPTS[turnId];
  return typeof p === 'function' ? p(answers) : (p ?? '');
}

const PLACEHOLDER: Record<string, string> = {
  ambition:      'Say the goal in your own words',
  type:          'wake or cadence',
  baseline:      'e.g. 08:30 or every day',
  target:        'e.g. 06:00 or every 7 days',
  endDate:       'e.g. 2026-12-31 or \'end of year\'',
  roundsPreview: 'ok',
  indicators:    'ok',
  confirm:       'yes',
};

@Component({
  selector: 'app-onboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './onboard.component.html',
  styleUrl: './onboard.component.scss',
})
export class OnboardComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store  = inject(StoreService);
  private readonly llm    = inject(LlmService);

  @ViewChild('chatScroll') chatScroll!: ElementRef;

  readonly state      = signal<OnboardState>(initialState());
  readonly transcript = signal<Bubble[]>([]);
  readonly text       = signal('');
  readonly error      = signal('');
  readonly llmOn      = signal(false);
  readonly busy       = signal(false);

  constructor() {
    effect(() => {
      const _ = this.transcript();
      setTimeout(() => {
        const el = this.chatScroll?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    });
  }

  async ngOnInit(): Promise<void> {
    const goalId = this.route.snapshot.queryParamMap.get('goalId');

    if (goalId) {
      clearDraft();
      const goal = await this.store.getGoal(goalId);
      if (goal) {
        const answers: Partial<Record<TurnId, unknown>> = {
          ambition:      goal.ambition ?? goal.name,
          baseline:      goal.baseline,
          target:        goal.target,
          endDate:       goal.endDate,
          roundsPreview: goal.rounds,
        };
        const loaded: OnboardState = {
          sessionId: (goal as unknown as { sessionId?: string }).sessionId ?? initialState().sessionId,
          answers,
          name: goal.name,
          cat:  goal.cat,
        };
        this.state.set(loaded);
        const turn = nextTurn(loaded);
        const firstId = turn.done ? TURNS[TURNS.length - 1] : (turn.id ?? TURNS[0]);
        this.transcript.set([{ role: 'assistant', text: promptFor(firstId, answers as Record<string, unknown>) }]);
      } else {
        this.initFresh();
      }
    } else {
      const draft = loadDraft();
      if (draft) {
        this.state.set(draft.state);
        this.transcript.set(draft.transcript);
      } else {
        this.initFresh();
      }
    }

    this.llmOn.set(this.llm.configured());
  }

  private initFresh(): void {
    const s = initialState();
    this.state.set(s);
    this.transcript.set([{ role: 'assistant', text: promptFor(TURNS[0], {}) }]);
  }

  get currentTurnId(): TurnId | undefined {
    return nextTurn(this.state()).id;
  }

  get isDone(): boolean {
    return nextTurn(this.state()).done;
  }

  get placeholder(): string {
    return this.currentTurnId ? (PLACEHOLDER[this.currentTurnId] ?? '') : '';
  }

  async onSend(): Promise<void> {
    const userText = this.text().trim();
    if (!userText || this.isDone || this.busy()) return;
    this.text.set('');
    await this.submit(userText);
  }

  async onSkip(): Promise<void> {
    if (this.isDone || this.busy()) return;
    const turnId = this.currentTurnId;
    if (!turnId) return;

    const answers = this.state().answers as Record<string, unknown>;
    const SKIP_DEFAULTS: Record<string, string> = {
      ambition:  'unnamed goal',
      baseline:  answers['type'] === 'cadence' ? 'every 7 days' : '08:00',
      target:    answers['type'] === 'cadence' ? 'every 14 days' : '06:30',
      endDate:   'end of year',
    };

    const skipText = SKIP_DEFAULTS[turnId] ?? 'ok';
    await this.submit(skipText);
  }

  private async submit(userText: string): Promise<void> {
    const turnId = this.currentTurnId;
    if (!turnId || this.busy()) return;

    this.busy.set(true);
    this.error.set('');

    this.transcript.update((t) => [...t, { role: 'user', text: userText }]);

    try {
      let result: { extractedValue?: unknown; assistant: string };

      if (this.llmOn()) {
        result = await runTurn({
          state: this.state(),
          turnId,
          userText,
          llmChat: this.llm.chat,
        });
      } else {
        result = scriptedTurn({ state: this.state(), turnId, userText });
      }

      if (result.extractedValue === undefined) {
        this.error.set(result.assistant);
        this.transcript.update((t) => t.slice(0, -1));
      } else {
        await this.processExtracted(userText, result.extractedValue, result.assistant);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Something went wrong.');
      this.transcript.update((t) => t.slice(0, -1));
    } finally {
      this.busy.set(false);
    }
  }

  private async processExtracted(
    _userText: string,
    extractedValue: unknown,
    assistant: string,
  ): Promise<void> {
    const turnId = this.currentTurnId;
    if (!turnId) return;

    const v = validate(turnId, extractedValue);
    if (!v.ok) {
      this.error.set(v.error ?? 'Invalid value.');
      this.transcript.update((t) => t.slice(0, -1));
      return;
    }

    const newState = applyInput(this.state(), turnId, extractedValue);
    this.state.set(newState);

    const updatedTranscript: Bubble[] = [
      ...this.transcript(),
      { role: 'assistant', text: assistant },
    ];

    const turn = nextTurn(newState);

    if (turn.done) {
      this.transcript.set(updatedTranscript);
      clearDraft();
      try {
        const goal = finalize(newState);
        await this.store.saveGoal(goal);
        await this.router.navigate(['/']);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Could not save goal.');
      }
    } else {
      const nextPrompt = promptFor(turn.id!, newState.answers as Record<string, unknown>);
      const withNext: Bubble[] = [...updatedTranscript, { role: 'assistant', text: nextPrompt }];
      this.transcript.set(withNext);
      saveDraft(newState, withNext);
    }
  }
}
