import {
  pgTable,
  serial,
  bigint,
  varchar,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// 1. ТАБЛИЦА: Пользователи (users)
// ============================================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  programs: many(trainingPrograms),
  reminders: many(reminders),
}));

// ============================================================================
// 2. ТАБЛИЦА: Программы тренировок (training_programs)
// ============================================================================
export const trainingPrograms = pgTable(
  'training_programs',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userProgramNameUniqueIdx: uniqueIndex('user_program_name_unique_idx').on(
      table.userId,
      table.name
    ),
  })
);

// ============================================================================
// 3. ТАБЛИЦА: Упражнения в программе (exercises)
// ============================================================================
export const exercises = pgTable(
  'exercises',
  {
    id: serial('id').primaryKey(),
    programId: integer('program_id')
      .notNull()
      .references(() => trainingPrograms.id),
    name: varchar('name', { length: 255 }).notNull(),
    displayOrder: integer('display_order').default(1).notNull(),
  },
  (table) => ({
    programOrderIdx: uniqueIndex('program_display_order_idx').on(
      table.programId,
      table.displayOrder
    ),
  })
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  program: one(trainingPrograms, {
    fields: [exercises.programId],
    references: [trainingPrograms.id],
  }),
  sets: many(sets),
}));

// ============================================================================
// 4. ТАБЛИЦА: Фактические сессии тренировок (workout_sessions)
// ============================================================================
export const workoutSessions = pgTable('workout_sessions', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => trainingPrograms.id),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  program: one(trainingPrograms, {
    fields: [workoutSessions.programId],
    references: [trainingPrograms.id],
  }),
  sets: many(sets),
}));

// ============================================================================
// 5. ТАБЛИЦА: Выполненные подходы (sets)
// ============================================================================
export const sets = pgTable(
  'sets',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    setNumber: integer('set_number').notNull(),
    // ИСПРАВЛЕНО: переведено на real (float) для поддержки дробного веса (например, 54.5)
    weight: real('weight').default(0).notNull(),
    reps: integer('reps').default(0).notNull(),
  },
  (table) => ({
    sessionExerciseSetIdx: uniqueIndex('session_exercise_set_idx').on(
      table.sessionId,
      table.exerciseId,
      table.setNumber
    ),
  })
);

export const setsRelations = relations(sets, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [sets.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [sets.exerciseId],
    references: [exercises.id],
  }),
}));

// ============================================================================
// 6. ТАБЛИЦА: Настройки напоминаний (reminders)
// ============================================================================
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),

  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
    }),

  isEnabled: boolean('is_enabled').default(true).notNull(),

  timezone: varchar('timezone', {
    length: 64,
  })
    .default('Europe/Riga')
    .notNull(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const remindersRelations = relations(reminders, ({ one, many }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),

  schedule: many(reminderSchedule),
}));

// ============================================================================
// 7. ТАБЛИЦА: Расписание напоминаний (reminder_schedule)
// ============================================================================
export const reminderSchedule = pgTable(
  'reminder_schedule',
  {
    id: serial('id').primaryKey(),

    reminderId: integer('reminder_id')
      .notNull()
      .references(() => reminders.id, {
        onDelete: 'cascade',
      }),

    dayOfWeek: integer('day_of_week').notNull(),

    time: varchar('time', {
      length: 5,
    }).notNull(),
  },
  (table) => ({
    reminderDayUnique: uniqueIndex('reminder_day_unique').on(
      table.reminderId,
      table.dayOfWeek
    ),
  })
);

export const reminderScheduleRelations = relations(
  reminderSchedule,
  ({ one }) => ({
    reminder: one(reminders, {
      fields: [reminderSchedule.reminderId],
      references: [reminders.id],
    }),
  })
);