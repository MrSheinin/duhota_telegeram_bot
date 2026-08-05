import ExcelJS from 'exceljs';
import { db } from '../db/index.js';
import { workoutSessions, trainingPrograms, sets, users } from '../db/schema.js';
import { eq, and, gte, desc, inArray } from 'drizzle-orm';
import { HistoryPeriod, HistoryService } from './history.service.js';
import { formatWorkoutHeaderDate } from '../utils/date.js';

export class ExcelService {
  /**
   * Генерация Excel-файла с историей тренировок
   * @param telegramId Идентификатор пользователя из Telegram (ctx.from.id)
   * @param period Выбранный период истории
   */
  static async generateExportBuffer(telegramId: number, period: HistoryPeriod): Promise<Buffer> {
    const startDate = HistoryService.getStartDate(period);

    // 1. Поиск внутреннего ID пользователя по его Telegram ID
    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
      columns: { id: true },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('История тренировок');

    if (!user) {
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(arrayBuffer);
    }

    // 2. Получаем ID программ пользователя по внутреннему user.id
    const userPrograms = await db.query.trainingPrograms.findMany({
      where: eq(trainingPrograms.userId, user.id),
      columns: { id: true },
    });

    const programIds = userPrograms.map((p) => p.id);

    if (programIds.length === 0) {
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(arrayBuffer);
    }

    // 3. Формируем условия выборки сессий
    const conditions = [inArray(workoutSessions.programId, programIds)];
    if (startDate) {
      conditions.push(gte(workoutSessions.completedAt, startDate));
    }

    const sessions = await db.query.workoutSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(workoutSessions.completedAt)],
      with: {
        program: true,
        sets: {
          with: { exercise: true },
          orderBy: [sets.setNumber],
        },
      },
    });

    // Настройка ширины колонок
    worksheet.getColumn(1).width = 30; // Имя упражнения
    for (let col = 2; col <= 12; col++) {
      worksheet.getColumn(col).width = 14; // Колонки подходов
    }

    let currentRow = 1;

    for (const session of sessions) {
      const headerText = `📅 ${formatWorkoutHeaderDate(session.completedAt)} — ${session.program?.name || 'Тренировка'}`;

      // 1. Заголовок тренировки
      worksheet.mergeCells(currentRow, 1, currentRow, 7);
      const titleCell = worksheet.getCell(currentRow, 1);
      titleCell.value = headerText;
      titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' } };
      currentRow++;

      // 2. Группировка подходов по упражнениям
      const exerciseMap = new Map<string, Array<{ weight: number; reps: number }>>();
      const sortedSets = [...session.sets].sort((a, b) => a.exercise.displayOrder - b.exercise.displayOrder);

      for (const set of sortedSets) {
        const exName = set.exercise.name;
        if (!exerciseMap.has(exName)) {
          exerciseMap.set(exName, []);
        }
        exerciseMap.get(exName)!.push({ weight: set.weight, reps: set.reps });
      }

      let maxSets = 0;
      exerciseMap.forEach((setsList) => {
        if (setsList.length > maxSets) maxSets = setsList.length;
      });

      // 3. Шапка таблицы упражнений
      const tableHeader = ['Упражнение'];
      for (let i = 1; i <= Math.max(maxSets, 1); i++) {
        tableHeader.push(`Подход ${i}`);
      }
      const headerRow = worksheet.addRow(tableHeader);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECF0F1' } };
      });
      currentRow++;

      // 4. Заполнение подходов
      exerciseMap.forEach((setsList, exName) => {
        const rowValues: (string | number)[] = [exName];
        setsList.forEach((s) => {
          rowValues.push(`${s.weight} кг × ${s.reps}`);
        });
        worksheet.addRow(rowValues);
        currentRow++;
      });

      // Разделитель между тренировками
      currentRow += 2;
      worksheet.addRow([]);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}