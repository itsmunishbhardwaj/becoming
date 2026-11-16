import { Routes } from '@angular/router';
import { NavShellComponent } from './shell/nav-shell.component';
import { YearComponent }        from './screens/year.component';
import { GoalsComponent }       from './screens/goals.component';
import { GoalComponent }        from './screens/goal.component';
import { QuickCreateComponent } from './screens/quick-create.component';
import { DayComponent }         from './screens/day.component';
import { MonthComponent }       from './screens/month.component';
import { WeekComponent }        from './screens/week.component';
import { JournalComponent }     from './screens/journal.component';
import { TodoComponent }        from './screens/todo.component';
import { InsightsComponent }    from './screens/insights.component';
import { CoachCarterComponent } from './screens/coach-carter.component';
import { OnboardComponent }     from './screens/onboard.component';
import { SignInComponent }      from './screens/sign-in.component';

export const routes: Routes = [
  { path: 'signin',  component: SignInComponent },
  { path: 'onboard', component: OnboardComponent },
  {
    path: '',
    component: NavShellComponent,
    children: [
      { path: '',              redirectTo: 'year', pathMatch: 'full' },
      { path: 'year',          component: YearComponent },
      { path: 'day/:date',     component: DayComponent },
      { path: 'month/:month',  component: MonthComponent },
      { path: 'week/:week',    component: WeekComponent },
      { path: 'goals',         component: GoalsComponent },
      { path: 'goal/:id',      component: GoalComponent },
      { path: 'create',        component: QuickCreateComponent },
      { path: 'journal',       component: JournalComponent },
      { path: 'journal/:id',   component: JournalComponent },
      { path: 'todo',          component: TodoComponent },
      { path: 'insights',      component: InsightsComponent },
      { path: 'coach-carter',  component: CoachCarterComponent },
      { path: '**',            redirectTo: 'year' },
    ],
  },
];
