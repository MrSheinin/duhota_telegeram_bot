import { eq, desc, asc, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  trainingPrograms,
  exercises,
  workoutSessions,
  sets,
} from '../db/schema.js';

export interface ExerciseInput {
  name: string;
  displayOrder: number;
  sets: {
    setNumber: number;
    weight: number;
    reps: number;
  }[];
}

export interface WorkingSet {
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface WorkingExercise {
  exerciseId: number;
  name: string;
  displayOrder: number;
  sets: WorkingSet[];
}

export class WorkoutService {
  /**
   * Получить все активные программы тренировок пользователя
   */
  static async getUserPrograms(userId: number) {
    console.log(`🔍 [WorkoutService.getUserPrograms] Запрос программ для userId: ${userId}`);
    const programs = await db
      .select()
      .from(trainingPrograms)
      .where(
        and(
          eq(trainingPrograms.userId, userId),
          eq(trainingPrograms.isArchived, false)
        )
      );
    console.log(`📦 [WorkoutService.getUserPrograms] Найдено программ: ${programs.length}`, programs);
    return programs;
  }

  /**
   * Проверить, существует ли у пользователя активная программа с таким же именем
   */
  static async isProgramNameExists(userId: number, programName: string): Promise<boolean> {
    console.log(`🔍 [WorkoutService.isProgramNameExists] Проверка имени "${programName}" для userId: ${userId}`);
    const existing = await db.query.trainingPrograms.findFirst({
      where: and(
        eq(trainingPrograms.userId, userId),
        eq(trainingPrograms.name, programName.trim()),
        eq(trainingPrograms.isArchived, false)
      ),
    });
    return Boolean(existing);
  }

  /**
   * Получить программу по её ID
   */
  static async getProgramById(programId: number) {
    console.log(`🔍 [WorkoutService.getProgramById] Запрос программы ID: ${programId}`);
    return await db.query.trainingPrograms.findFirst({
      where: eq(trainingPrograms.id, programId),
    });
  }

  /**
   * Полное создание программы тренировки (Контейнер -> Упражнения -> Базовые подходы в 1-й сессии)
   */
  static async createProgram(
    userId: number,
    programName: string,
    exerciseInputs: ExerciseInput[]
  ) {
    console.log(`🛠️ [WorkoutService.createProgram] Создание программы "${programName}" для userId: ${userId}`);
    return await db.transaction(async (tx) => {
      // 1. Создаем программу (Контейнер)
      const [program] = await tx
        .insert(trainingPrograms)
        .values({
          userId,
          name: programName.trim(),
        })
        .returning();
      console.log(`✅ [WorkoutService.createProgram] Создана программа ID: ${program.id}`);

      // 2. Создаем первую шаблонную сессию
      const [initialSession] = await tx
        .insert(workoutSessions)
        .values({
          programId: program.id,
        })
        .returning();
      console.log(`✅ [WorkoutService.createProgram] Создана базовая сессия ID: ${initialSession.id}`);

      // 3. Создаем упражнения и привязанные к ним подходы
      for (const ex of exerciseInputs) {
        const [createdExercise] = await tx
          .insert(exercises)
          .values({
            programId: program.id,
            name: ex.name,
            displayOrder: ex.displayOrder,
          })
          .returning();

        for (const setItem of ex.sets) {
          await tx.insert(sets).values({
            sessionId: initialSession.id,
            exerciseId: createdExercise.id,
            setNumber: setItem.setNumber,
            weight: setItem.weight,
            reps: setItem.reps,
          });
        }
      }

      console.log(`🎉 [WorkoutService.createProgram] Успешно создано упражнений: ${exerciseInputs.length}`);
      return program;
    });
  }

  /**
   * ШАГ 1 ТРЕНИРОВКИ: Загружаем данные последней сессии в память для диалога (READ ONLY)
   */
  static async getInitialWorkoutData(programId: number): Promise<WorkingExercise[]> {
    console.log(`\n=================== [LOG START: getInitialWorkoutData] ===================`);
    console.log(`📥 [WorkoutService.getInitialWorkoutData] Получен programId:`, programId, `(Тип: ${typeof programId})`);

    if (!programId || isNaN(programId)) {
      console.error(`❌ [WorkoutService.getInitialWorkoutData] КРИТИЧЕСКАЯ ОШИБКА: Передан невалидный programId!`);
      console.log(`=================== [LOG END: getInitialWorkoutData] ===================\n`);
      return [];
    }

    // 1. Находим последнюю сессию этой программы (по убыванию ID для точного выбора последней созданной)
    console.log(`🔍 [WorkoutService.getInitialWorkoutData] Поиск последней сессии в workoutSessions по programId=${programId}...`);
    const lastSession = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.programId, programId),
      orderBy: [desc(workoutSessions.id)],
    });
    console.log(`📦 [WorkoutService.getInitialWorkoutData] Результат lastSession:`, lastSession);

    if (!lastSession) {
      console.warn(`⚠️ [WorkoutService.getInitialWorkoutData] У программы ID ${programId} НЕТ ни одной сессии в workoutSessions!`);
    }

    // 2. Получаем упражнения программы по порядку displayOrder
    console.log(`🔍 [WorkoutService.getInitialWorkoutData] Поиск упражнений в exercises по programId=${programId}...`);
    const progExercises = await db.query.exercises.findMany({
      where: eq(exercises.programId, programId),
      orderBy: [asc(exercises.displayOrder)],
    });
    console.log(`🏋️ [WorkoutService.getInitialWorkoutData] Найдено упражнений: ${progExercises.length}`, progExercises);

    if (progExercises.length === 0) {
      console.error(`❌ [WorkoutService.getInitialWorkoutData] ВНИМАНИЕ: У программы ID ${programId} НЕТ упражнений в таблице exercises!`);
      console.log(`=================== [LOG END: getInitialWorkoutData] ===================\n`);
      return [];
    }

    // 3. Получаем подходы из найденной последней сессии
    let previousSets: (typeof sets.$inferSelect)[] = [];
    if (lastSession) {
      console.log(`🔍 [WorkoutService.getInitialWorkoutData] Поиск подходов в sets по sessionId=${lastSession.id}...`);
      previousSets = await db.query.sets.findMany({
        where: eq(sets.sessionId, lastSession.id),
        orderBy: [asc(sets.setNumber)],
      });
      console.log(`🔢 [WorkoutService.getInitialWorkoutData] Найдено подходов: ${previousSets.length}`, previousSets);
    }

    // 4. Маппим структуру для интерактивного редактирования в диалоге
    const result = progExercises.map((ex) => {
      const exSets = previousSets
        .filter((s) => s.exerciseId === ex.id)
        .map((s) => ({
          exerciseId: ex.id,
          setNumber: s.setNumber,
          weight: Number(s.weight),
          reps: s.reps,
        }));

      return {
        exerciseId: ex.id,
        name: ex.name,
        displayOrder: ex.displayOrder,
        sets: exSets,
      };
    });

    console.log(`✅ [WorkoutService.getInitialWorkoutData] Сформированные данные для тренировки:`, JSON.stringify(result, null, 2));
    console.log(`=================== [LOG END: getInitialWorkoutData] ===================\n`);

    return result;
  }

  /**
   * ШАГ 2 ТРЕНИРОВКИ: Финальная запись готовой сессии и всех подходов в БД (WRITE)
   */
  static async saveWorkoutSession(
    programId: number,
    exercisesData: WorkingExercise[]
  ) {
    console.log(`💾 [WorkoutService.saveWorkoutSession] Сохранение завершенной сессии для programId: ${programId}`);
    return await db.transaction(async (tx) => {
      // 1. Создаем завершенную сессию
      const [newSession] = await tx
        .insert(workoutSessions)
        .values({
          programId,
          completedAt: new Date(),
        })
        .returning();
      console.log(`✅ [WorkoutService.saveWorkoutSession] Создана сессия ID: ${newSession.id}`);

      // 2. Разворачиваем все подходы из всех упражнений в плоский массив
      const allSetsToInsert = exercisesData.flatMap((ex) =>
        ex.sets.map((s) => ({
          sessionId: newSession.id,
          exerciseId: ex.exerciseId,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
        }))
      );

      // 3. Сохраняем подходы
      if (allSetsToInsert.length > 0) {
        await tx.insert(sets).values(allSetsToInsert);
        console.log(`✅ [WorkoutService.saveWorkoutSession] Сохранено подходов: ${allSetsToInsert.length}`);
      }

      return newSession;
    });
  }

  /**
   * Заархивировать/Удалить программу
   */
  static async deleteProgram(programId: number) {
    console.log(`🗑️ [WorkoutService.deleteProgram] Архивирование программы ID: ${programId}`);
    await db
      .update(trainingPrograms)
      .set({ isArchived: true })
      .where(eq(trainingPrograms.id, programId));
  }
}