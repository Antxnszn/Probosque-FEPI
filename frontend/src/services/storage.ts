export interface StorageHealthInfo {
  isPersistent: boolean;
  health: 'PERSISTENT' | 'BEST_EFFORT' | 'CRITICAL';
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
}

export async function checkAndRequestStorageHealth(): Promise<StorageHealthInfo> {
  let isPersistent = false;
  let usageBytes = 0;
  let quotaBytes = 0;

  if (navigator.storage && navigator.storage.persisted) {
    isPersistent = await navigator.storage.persisted();
    if (!isPersistent && navigator.storage.persist) {
      isPersistent = await navigator.storage.persist();
    }
  }

  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    usageBytes = estimate.usage || 0;
    quotaBytes = estimate.quota || 0;
  }

  const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  let health: 'PERSISTENT' | 'BEST_EFFORT' | 'CRITICAL' = 'BEST_EFFORT';
  if (isPersistent) {
    health = 'PERSISTENT';
  } else if (usagePercent > 90 || quotaBytes === 0) {
    health = 'CRITICAL';
  }

  return {
    isPersistent,
    health,
    usageBytes,
    quotaBytes,
    usagePercent: Math.round(usagePercent * 10) / 10,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
