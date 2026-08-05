export interface WorkoutCallbackPayload {
  action: 'edit' | 'add_set' | 'delete_set' | 'next' | 'finish' | 'cancel' | 'unknown';
  setNumber?: number;
}

/**
 * Парсер двоеточечных callback_data (например, "set:edit:1", "set:add", "set:delete" или "workout:finish")
 */
export function parseWorkoutCallback(data: string): WorkoutCallbackPayload {
  const parts = data.split(':');

  if (parts[0] === 'set') {
    if (parts[1] === 'edit') {
      return {
        action: 'edit',
        setNumber: parseInt(parts[2], 10),
      };
    }
    if (parts[1] === 'add') return { action: 'add_set' };
    if (parts[1] === 'delete') return { action: 'delete_set' };
  }

  if (parts[0] === 'workout') {
    if (parts[1] === 'next') return { action: 'next' };
    if (parts[1] === 'finish') return { action: 'finish' };
    if (parts[1] === 'cancel') return { action: 'cancel' };
  }

  return { action: 'unknown' };
}