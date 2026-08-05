import { InlineKeyboard } from 'grammy';

export interface SetDisplayItem {
  setNumber: number;
  weight: number;
  reps: number;
}

export class CreateProgramScreen {
  /**
   * Шаг 1: Запрос названия программы
   */
  static askProgramName() {
    const keyboard = new InlineKeyboard().text('❌ Отмена', 'cancel_flow');

    return [
      '📝 **Создание новой программы**, блядь\n\nПиши название программы, сука, и не тупи (например, *Push*, *Ноги* или *Верх тела*), чтоб хоть что-то, блядь, начать делать, нахуй:',
      {
        parse_mode: 'Markdown' as const,
        reply_markup: keyboard,
      },
    ] as const;
  }

  /**
   * Ошибка: Программа с таким именем уже существует
   */
  static askProgramNameExistsError(programName: string) {
    const keyboard = new InlineKeyboard().text('❌ Отмена', 'cancel_flow');

    return [
      `⚠️ Программа с названием «**${programName}**» уже существует, блядь!\n\nТы задолбал тупить, придумай уникальное название, нахуй:`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: keyboard,
      },
    ] as const;
  }

  /**
   * Шаг 2: Запрос названия упражнения
   */
  static askExerciseName(exerciseOrder: number) {
    const keyboard = new InlineKeyboard().text('❌ Отмена', 'cancel_flow');

    return [
      `🏋️ **Упражнение №${exerciseOrder}**, блядь\n\nКакое упражнение делать собрался, сука? Пиши название (например, *Жим лежа*), хватит яйца мять, нахуй:`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: keyboard,
      },
    ] as const;
  }

  /**
   * Шаг 3: Главный экран упражнения (динамически обновляется)
   */
  static askSets(exerciseName: string, sets: SetDisplayItem[]) {
    let text = `🏋️ Упражнение: **${exerciseName}**\n\n`;

    if (sets.length === 0) {
      text += '📋 Подходов нихуя нет, блядь. \n\nТы зашёл в зал прохлаждаться или ебошить, сука, нахуй? В наши годы по 6 подходов делали, а ты сидишь, жопу прижал, блядь! Давай делай что-нибудь!';
    } else {
      text += '📋 **Введенные подходы, блядь:**\n';
      sets.forEach((s) => {
        text += `• Подход ${s.setNumber}: **${s.weight} кг** × **${s.reps}**\n`;
      });
      text += '\n';
    }

    text +=
      '👇 Отправляй подход сообщением, блядь (например, 80x8 или 75.5x10).\n' +
      'После того как вбьёшь, твоё сообщение нахуй удалится, а список выше обновится, блядь, чтоб ты видел, что хоть что-то делаешь!';

    const keyboard = new InlineKeyboard();

    if (sets.length > 0) {
      keyboard.text('✅ Закончить упражнение, блядь', 'finish_exercise').row();
    }

    keyboard.text('❌ Отменить нахуй', 'cancel_flow');

    return [
      text,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: keyboard,
      },
    ] as const;
  }

  /**
   * Шаг 4: Развилка после упражнения
   */
  static askNextStep(totalExercises: number) {
    const keyboard = new InlineKeyboard()
      .text('➕ Добавить упражнение, блядь', 'add_exercise')
      .row()
      .text('🎉 Сохранить программу, нахуй', 'save_program')
      .row()
      .text('❌ Сдаться, сука', 'cancel_flow');

    return [
      `📊 В программе сейчас упражнений: **${totalExercises}**, блядь.\n\nНу и чё дальше, нахуй? Давай, решай, нахуй: вьёбываем дальше или закончил, блядь?`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: keyboard,
      },
    ] as const;
  }

  /**
   * Уведомления и ошибки
   */
  static cancelled() {
    return ['🚫 Создание программы отменено.'] as const;
  }

  static emptyProgramError() {
    return ['❌ Какая пустая программа, блядь?! У тебя что, прокладка вместо программы, что она сгорела нахуй? Нажми |Добавить упражнение|, сука, ебошь хотя бы одно — чтоб хоть что-то с тобой происходить начало, нахуй!'] as const;
  }

  static success(programName: string) {
    return [
      `🎉 Программа «**${programName}**» успешно сохранена, блядь! Я в 21 год уже хуярил во всю, ебать, а ты хоть эту программу осилишь, сука, или выгореть боишься, нахуй?`,
      { parse_mode: 'Markdown' as const },
    ] as const;
  }

  static error() {
    return ['💥 Всё нахуй сгорело при сохранении! Ты даже программу без лагов сохранить не можешь, блядь, у тебя что, прокладка вместо пальцев?! Давай ещё раз, сука, пробуй!'] as const;
  }
}