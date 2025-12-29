import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { api } from './api';
import type { Intake } from '../navigation/types';

const QUEUE_KEY = 'med-tracker:intake-queue';

type IntakeAction = {
  id: string;
  scheduleId: number;
  status: 'taken' | 'skipped';
  takenAt: string;
};

const buildKey = (action: IntakeAction) =>
  `${action.scheduleId}|${action.status}|${action.takenAt}`;

const isOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
};

const readQueue = async (): Promise<IntakeAction[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as IntakeAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: IntakeAction[]) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore cache write failures.
  }
};

const enqueueAction = async (action: IntakeAction) => {
  const queue = await readQueue();
  if (queue.some((item) => buildKey(item) === buildKey(action))) {
    return queue;
  }
  const next = [...queue, action];
  await writeQueue(next);
  return next;
};

export const getQueuedIntakes = readQueue;

export async function recordIntakeOfflineAware(
  token: string,
  scheduleId: number,
  status: 'taken' | 'skipped',
  takenAt: string
): Promise<{ queued: boolean }> {
  const action: IntakeAction = {
    id: `${scheduleId}-${status}-${takenAt}`,
    scheduleId,
    status,
    takenAt,
  };

  if (!(await isOnline())) {
    await enqueueAction(action);
    return { queued: true };
  }

  try {
    await api.post(
      '/intakes',
      {
        schedule_id: scheduleId,
        status,
        taken_at: takenAt,
      },
      token
    );
    return { queued: false };
  } catch (err) {
    const statusCode = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : null;
    if (!statusCode) {
      await enqueueAction(action);
      return { queued: true };
    }
    throw err;
  }
}

export async function syncIntakeQueue(token: string): Promise<void> {
  if (!(await isOnline())) {
    return;
  }

  const queue = await readQueue();
  if (queue.length === 0) {
    return;
  }

  const existing = await api.get<Intake[]>('/intakes', token);
  const existingKeys = new Set(
    existing.map((item) => `${item.schedule_id}|${item.status}|${item.taken_at}`)
  );

  const remaining: IntakeAction[] = [];

  for (const action of queue) {
    if (existingKeys.has(buildKey(action))) {
      continue;
    }

    try {
      await api.post(
        '/intakes',
        {
          schedule_id: action.scheduleId,
          status: action.status,
          taken_at: action.takenAt,
        },
        token
      );
      existingKeys.add(buildKey(action));
    } catch (err) {
      const statusCode = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : null;
      if (statusCode === 401) {
        remaining.push(action);
        break;
      }
      remaining.push(action);
    }
  }

  await writeQueue(remaining);
}
