import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'med-tracker:cache:';

type CacheEnvelope<T> = {
  data: T;
  updatedAt: string;
};

export async function cacheSet<T>(key: string, data: T): Promise<CacheEnvelope<T>> {
  const payload: CacheEnvelope<T> = {
    data,
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures.
  }

  return payload;
}

export async function cacheGet<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.updatedAt !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
