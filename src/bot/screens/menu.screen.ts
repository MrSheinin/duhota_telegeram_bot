import { mainMenuKeyboard } from '../keyboards/menu.keyboards.js';

export class MenuScreen {
  static mainWelcome(firstName?: string, customHeader?: string) {
    const name = firstName ? `, ${firstName}` : '';

    let text = '';
    if (customHeader) {
      // Если передана пасхалка/поздравление после тренировки
      text = `${customHeader}\n\n───────────────────\n🏋️‍♂️ **Главное меню, блядь!**\nХули ты застыл, сука?! Мы качались по 3.5 часа, а ты даже на кнопку нажать боишься, чтоб не выгореть?! Жми давай 👇`;
    } else {
      // Обычный вход в меню
      text = `👋 Здорово${name}, блядь!\n\nОпять блогером стать хочешь или пахать пришёл, нахуй?! Тыкай меню 👇`;
    }

    return [
      text,
      {
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard,
      },
    ] as const;
  }
}