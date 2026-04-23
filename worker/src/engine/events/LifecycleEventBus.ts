import type { LifecycleEvent, LifecycleEventType } from '../types';

/** Synchronous-only handler — returning a Promise is not supported; rejections would be silently dropped. */
type SyncLifecycleEventHandler<T extends LifecycleEvent = LifecycleEvent> = (event: T) => void;

export class LifecycleEventBus {
  private readonly subscribers = new Map<LifecycleEventType, Set<SyncLifecycleEventHandler>>();

  /**
   * Subscribes a handler to the given event type.
   * Returns an unsubscribe function — call it to remove this handler.
   */
  subscribe<T extends LifecycleEvent>(
    eventType: LifecycleEventType,
    handler: SyncLifecycleEventHandler<T>,
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    // Cast needed: the Set stores the base handler type; callers are responsible for T alignment.
    const set = this.subscribers.get(eventType)!;
    set.add(handler as SyncLifecycleEventHandler);

    return () => {
      set.delete(handler as SyncLifecycleEventHandler);
    };
  }

  /**
   * Fires all subscribers for `event.type` synchronously.
   * Handler errors are caught and logged; they never propagate.
   */
  emit(event: LifecycleEvent): void {
    const set = this.subscribers.get(event.type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[LifecycleEventBus] Handler error for "${event.type}":`, err);
      }
    }
  }

  /** Removes all subscribers. Useful for test teardown. */
  clear(): void {
    this.subscribers.clear();
  }
}

export const lifecycleEventBus = new LifecycleEventBus();
