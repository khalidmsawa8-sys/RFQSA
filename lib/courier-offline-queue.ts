/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ COURIER OFFLINE SYNC & INDEXED-DB QUEUE (طابور العمليات الميدانية الأوفلاين)
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side resilient offline engine:
 * 1. IndexedDB primary store with localStorage fallback.
 * 2. Idempotency Key (UUID v4) preserved per queued command.
 * 3. Auto-sync on network reconnect with conflict resilience (409 Conflict handling).
 * 4. Reactive visual sync status events for the Mobile-First UI.
 */

export interface QueuedDeliveryCommand {
  id: string; // Unique queue item ID
  deliveryId: string;
  targetStatus: string;
  idempotencyKey: string;
  otpCode?: string | null;
  podPhotoUrl?: string | null;
  podMetadata?: any;
  telemetry?: {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    timestamp?: string;
  } | null;
  timestamp: string;
  status: "PENDING" | "SYNCING" | "FAILED" | "CONFLICT";
  errorReason?: string;
  retryCount: number;
}

const DB_NAME = "RIFQ_COURIER_OFFLINE_DB";
const STORE_NAME = "pending_delivery_commands";
const FALLBACK_KEY = "rifq_courier_offline_queue_backup";

// Generate UUID v4 for client-side Idempotency Keys
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "idem-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now();
}

// 1. IndexedDB Helpers
function openCourierDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 2. Queue Operations
export async function enqueueDeliveryCommand(command: Omit<QueuedDeliveryCommand, "id" | "status" | "retryCount">): Promise<QueuedDeliveryCommand> {
  const fullCommand: QueuedDeliveryCommand = {
    ...command,
    id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: "PENDING",
    retryCount: 0,
  };

  try {
    const db = await openCourierDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(fullCommand);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  } catch (err) {
    // Fallback to localStorage
    console.warn("IndexedDB unavailable, falling back to localStorage:", err);
    try {
      const existing = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
      existing.push(fullCommand);
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(existing));
    } catch (lsErr) {
      console.error("Local storage fallback failed:", lsErr);
    }
  }

  notifySyncListeners();
  return fullCommand;
}

export async function getPendingCommands(): Promise<QueuedDeliveryCommand[]> {
  try {
    const db = await openCourierDatabase();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve(getLocalStorageFallback());
    });
  } catch (err) {
    return getLocalStorageFallback();
  }
}

function getLocalStorageFallback(): QueuedDeliveryCommand[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function removeQueuedCommand(id: string): Promise<void> {
  try {
    const db = await openCourierDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    const existing = getLocalStorageFallback().filter((cmd) => cmd.id !== id);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(existing));
  }
  notifySyncListeners();
}

// 3. Batch Sync Execution Engine
export async function flushCourierOfflineQueue(): Promise<{
  syncedCount: number;
  conflictsCount: number;
  failedCount: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, conflictsCount: 0, failedCount: 0 };
  }

  const pending = await getPendingCommands();
  if (pending.length === 0) {
    return { syncedCount: 0, conflictsCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let conflictsCount = 0;
  let failedCount = 0;

  for (const cmd of pending) {
    try {
      const response = await fetch(`/api/v1/courier/deliveries/${cmd.deliveryId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: cmd.targetStatus,
          idempotencyKey: cmd.idempotencyKey,
          otpCode: cmd.otpCode,
          podPhotoUrl: cmd.podPhotoUrl,
          podMetadata: cmd.podMetadata,
          telemetry: cmd.telemetry,
          source: "offline_sync",
        }),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        await removeQueuedCommand(cmd.id);
        syncedCount++;
      } else if (response.status === 409) {
        // Safe conflict: Reassigned or modified on another device
        console.warn("Sync Conflict detected for delivery:", cmd.deliveryId, resJson.error);
        await removeQueuedCommand(cmd.id);
        conflictsCount++;
      } else {
        failedCount++;
      }
    } catch (netErr) {
      console.warn("Network error during sync replay:", netErr);
      failedCount++;
    }
  }

  notifySyncListeners();
  return { syncedCount, conflictsCount, failedCount };
}

// 4. Reactive Sync Status Listeners
type SyncListener = (pendingCount: number, isOnline: boolean) => void;
const listeners = new Set<SyncListener>();

export function subscribeToCourierSync(listener: SyncListener): () => void {
  listeners.add(listener);
  notifySyncListeners();

  return () => {
    listeners.delete(listener);
  };
}

async function notifySyncListeners() {
  const pending = await getPendingCommands();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  listeners.forEach((fn) => fn(pending.length, isOnline));
}

// Setup Auto-Sync on Network Connect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Network online restored! Triggering automatic courier queue sync...");
    flushCourierOfflineQueue();
  });

  window.addEventListener("offline", () => {
    notifySyncListeners();
  });
}
