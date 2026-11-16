import { Injectable, signal } from '@angular/core';
import type { Goal, Log, LogEvent, JournalEntry, Task, Contract } from '../core/types';
import {
  listGoals, getGoal, saveGoal, deleteGoal,
  readLog, readLogsInRange, appendLog, deleteLogEvent, saveNote,
  listJournal, saveJournal, deleteJournal,
  listTasks, addTask, setTaskDone, reorderTasks, carryTask, listTaskLog,
  listContracts, saveContract, retireContract,
} from '../core/store';

@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly goals = signal<Goal[]>([]);
  readonly goalsLoaded = signal(false);

  async loadGoals(): Promise<void> {
    const list = await listGoals();
    this.goals.set(list);
    this.goalsLoaded.set(true);
  }

  async saveGoal(goal: Goal): Promise<void> {
    await saveGoal(goal);
    this.goals.update((gs) => {
      const idx = gs.findIndex((g) => g.id === goal.id);
      return idx >= 0 ? gs.map((g) => (g.id === goal.id ? goal : g)) : [...gs, goal];
    });
  }

  async deleteGoal(id: string): Promise<void> {
    await deleteGoal(id);
    this.goals.update((gs) => gs.filter((g) => g.id !== id));
  }

  getGoal = getGoal;
  readLog = readLog;
  readLogsInRange = readLogsInRange;
  appendLog = appendLog;
  deleteLogEvent = deleteLogEvent;
  saveNote = saveNote;
  listJournal = listJournal;
  saveJournal = saveJournal;
  deleteJournal = deleteJournal;
  listTasks = listTasks;
  addTask = addTask;
  setTaskDone = setTaskDone;
  reorderTasks = reorderTasks;
  carryTask = carryTask;
  listTaskLog = listTaskLog;
  listContracts = listContracts;
  saveContract = saveContract;
  retireContract = retireContract;
}
