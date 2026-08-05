import { WorkoutKeyboard } from '../keyboards/workout.keyboards.js';

export class WorkoutScreen {
  static noPrograms() {
    return [
      '⚠️ У тебя ни одной программы нет, блядь!\n\nТы думал просто так в зале сидеть и беседы пиздеть?! Создавай программу, нахуй, чтоб хоть что-то делать начал!',
      { reply_markup: WorkoutKeyboard.noPrograms() },
    ] as const;
  }

  static selectProgram(programs: { id: number; name: string }[]) {
    return [ 
      '🏋️ **Выбирай программу, блядь, и иди въёбывать:**\n_(или жми 🗑️, если сдулся и снести её хочешь, нахуй)_',
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutKeyboard.selectProgram(programs),
      },
    ] as const;
  }

  static confirmDelete(programId: number, programName: string) {
    return [
      `⚠️ *Ты чё, сука, реально хочешь снести программу "${programName}"?*\n\nСтираешь — и всё, блядь, обратно её уже не вытащишь!`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutKeyboard.confirmDelete(programId, programName),
      },
    ] as const;
  }

  static cancelled() {
    return [
      '🚫 Отменил тренировку, блядь! Ну и сиди дальше ровно, пока другие в зале ебошат.',
      { reply_markup: WorkoutKeyboard.goToMenu() },
    ] as const;
  }
}