import { InlineKeyboard } from 'grammy';

export class WorkoutKeyboard {
  /**
   * Кнопки выбора программы с иконками удаления
   */
  static selectProgram(programs: { id: number; name: string }[]) {
    const keyboard = new InlineKeyboard();
    
    for (const prog of programs) {
      // Строка: [ Выбрать программу ] [ 🗑️ ]
      keyboard
        .text(prog.name, `select_program:${prog.id}`)
        .text('🗑️', `confirm_delete:${prog.id}`)
        .row();
    }
    
    keyboard.text('🚫 Отмена', 'cancel_flow');
    return keyboard;
  }

  /**
   * Клавиатура подтверждения удаления
   */
  static confirmDelete(programId: number, programName: string) {
    return new InlineKeyboard()
      .text(`❌ Да, удалить "${programName}"`, `delete_program:${programId}`)
      .row()
      .text('⬅️ Назад', 'back_to_select');
  }

  static noPrograms() {
    return new InlineKeyboard()
      .text('➕ Создать программу', 'create_program')
      .row()
      .text('🏠 В главное меню', 'go_to_menu');
  }

  static goToMenu() {
    return new InlineKeyboard().text('🏠 В главное меню', 'go_to_menu');
  }
}