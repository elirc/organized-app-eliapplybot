// Minimal in-memory chrome.storage.local mock for unit tests.

type StorageShape = Record<string, unknown>;

export function installChromeMock(): { data: StorageShape; reset: () => void } {
  const data: StorageShape = {};

  const local = {
    async get(keys: string | string[] | null | undefined): Promise<StorageShape> {
      if (keys === null || keys === undefined) return { ...data };
      const wanted = Array.isArray(keys) ? keys : [keys];
      const result: StorageShape = {};
      for (const key of wanted) {
        if (key in data) result[key] = structuredClone(data[key]);
      }
      return result;
    },
    async set(items: StorageShape): Promise<void> {
      for (const [key, value] of Object.entries(items)) {
        data[key] = structuredClone(value);
      }
    },
    async remove(keys: string | string[]): Promise<void> {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    }
  };

  (globalThis as { chrome?: unknown }).chrome = { storage: { local } };

  return {
    data,
    reset() {
      for (const key of Object.keys(data)) delete data[key];
    }
  };
}
