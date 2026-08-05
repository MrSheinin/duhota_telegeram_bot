import { formatWorkoutHeaderDate } from './date.js';
import { escapeMarkdown } from './markdown.js';

type WorkoutDetails = Awaited<ReturnType<typeof import('../services/history.service.js').HistoryService.getWorkoutDetails>>;

export function formatWorkoutCard(workout: NonNullable<WorkoutDetails>): string {
  const programName = escapeMarkdown(workout.program?.name || 'Тренировка');
  const formattedDate = escapeMarkdown(formatWorkoutHeaderDate(workout.completedAt));

  // Группировка подходов по упражнениям с сохранением порядка displayOrder
  const exerciseMap = new Map<string, Array<{ weight: number; reps: number }>>();
  
  for (const set of workout.sets) {
    const exName = set.exercise.name;
    if (!exerciseMap.has(exName)) {
      exerciseMap.set(exName, []);
    }
    exerciseMap.get(exName)!.push({ weight: set.weight, reps: set.reps });
  }

  const totalExercises = exerciseMap.size;
  const totalSets = workout.sets.length;

  const lines: string[] = [];
  lines.push(`🏋️ *${programName}*`);
  lines.push(`📅 ${formattedDate}`);
  lines.push(`───────────────`);
  lines.push(`Упражнений: *${totalExercises}*`);
  lines.push(`Подходов: *${totalSets}*`);
  lines.push(`───────────────\n`);

  exerciseMap.forEach((setsList, exName) => {
    const safeExName = escapeMarkdown(exName);
    lines.push(`🏋️ *${safeExName}*`);
    setsList.forEach((s) => {
      lines.push(`  • ${s.weight} × ${s.reps}`);
    });
    lines.push(``);
  });

  return lines.join('\n').trim();
}