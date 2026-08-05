import { db } from '../db/index.js';
import { workoutSessions, trainingPrograms, sets, users } from '../db/schema.js';
import { eq, and, gte, desc, inArray } from 'drizzle-orm';

export type HistoryPeriod = 'week' | 'month' | 'year' | 'all';

export interface WorkoutListItemDTO {
  id: number;
  programName: string;
  completedAt: Date;
  exerciseCount: number;
  setCount: number;
}

export class HistoryService {
  public static getStartDate(period: HistoryPeriod): Date | null {
    const now = new Date();
    switch (period) {
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return start;
      }
      case 'month': {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        return start;
      }
      case 'year': {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        return start;
      }
      case 'all':
      default:
        return null;
    }
  }

  /**
   * Возвращает список DTO с агрегированной информацией для экрана выбора тренировок
   * @param telegramId Идентификатор пользователя из Telegram (ctx.from.id)
   */
  static async getWorkoutList(telegramId: number, period: HistoryPeriod): Promise<WorkoutListItemDTO[]> {
    // 1. Находим пользователя по telegramId, чтобы получить его внутренний id в БД
    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
      columns: { id: true },
    });

    if (!user) return [];

    const startDate = this.getStartDate(period);

    // 2. Находим id программ пользователя по внутреннему user.id
    const userPrograms = await db.query.trainingPrograms.findMany({
      where: eq(trainingPrograms.userId, user.id),
      columns: { id: true },
    });

    const programIds = userPrograms.map((p) => p.id);
    if (programIds.length === 0) return [];

    // 3. Формируем фильтры
    const conditions = [inArray(workoutSessions.programId, programIds)];
    if (startDate) {
      conditions.push(gte(workoutSessions.completedAt, startDate));
    }

    // 4. Выбираем сессии с подходами и программой
    const sessions = await db.query.workoutSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(workoutSessions.completedAt)],
      with: {
        program: true,
        sets: {
          columns: { exerciseId: true },
        },
      },
    });

    // 5. Маппим в DTO
    return sessions.map((s) => {
      const uniqueExercises = new Set(s.sets.map((set) => set.exerciseId));
      return {
        id: s.id,
        programName: s.program.name,
        completedAt: s.completedAt,
        exerciseCount: uniqueExercises.size,
        setCount: s.sets.length,
      };
    });
  }

  /**
   * Полные детали одной тренировки для карточки просмотра
   * @param sessionId ID сессии
   * @param telegramId Идентификатор пользователя из Telegram
   */
  static async getWorkoutDetails(sessionId: number, telegramId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
      columns: { id: true },
    });

    if (!user) return null;

    const session = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, sessionId),
      with: {
        program: true,
        sets: {
          with: {
            exercise: true,
          },
          orderBy: [sets.setNumber],
        },
      },
    });

    if (!session || session.program.userId !== user.id) {
      return null;
    }

    // Сортируем подходы по displayOrder упражнения
    session.sets.sort((a, b) => a.exercise.displayOrder - b.exercise.displayOrder);

    return session;
  }
}