import 'dotenv/config'; // <-- Загружает .env ДО всего остального!
import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z
    .string()
    .min(1, 'BOT_TOKEN обязателен и не может быть пустым'),

  DATABASE_URL: z
    .string()
    .url('DATABASE_URL должен быть валидным URL'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Ошибка в файле .env (неверные переменные окружения):');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();