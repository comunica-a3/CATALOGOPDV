import { StorageService } from './storage';
import { api } from './api';

type SyncCallback = (event?: string, data?: any) => void;

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private callbacks: Set<SyncCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private debounceTimer: any = null;
  private isSyncing: boolean = false;

  constructor() {
    this.setupBroadcastChannel();
  }

  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pdv_catalog_realtime_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.handleSyncTrigger(event.data.type, event.data.data, false);
          }
        };
      } catch (err) {
        console.debug('BroadcastChannel not supported or failed to initialize:', err);
      }
    }
  }

  public subscribe(callback: SyncCallback): () => void {
    this.callbacks.add(callback);
    this.ensureConnection();

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  public ensureConnection() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.eventSource = new EventSource('/api/sync/events');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.event && payload.event !== 'connected') {
            this.handleSyncTrigger(payload.event, payload.data, true);
          }
        } catch {
          // ignore keep-alive / ping messages
        }
      };

      // Listen to specific custom event names
      const registeredEvents = [
        'catalog-updated',
        'items-updated',
        'catalog-niches-updated',
        'categories-updated',
        'settings-updated',
        'production-updated',
      ];

      for (const evtName of registeredEvents) {
        this.eventSource.addEventListener(evtName, (e: any) => {
          try {
            const parsed = JSON.parse(e.data || '{}');
            this.handleSyncTrigger(evtName, parsed.data, true);
          } catch {
            this.handleSyncTrigger(evtName, null, true);
          }
        });
      }

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Retry connection with 3s backoff
        if (!this.reconnectTimer && this.callbacks.size > 0) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.ensureConnection();
          }, 3000);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      console.debug('Failed to establish EventSource:', err);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  private handleSyncTrigger(event: string, data: any, fromNetwork: boolean) {
    // Debounce triggers within 120ms
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      this.debounceTimer = null;
      if (this.isSyncing) return;
      this.isSyncing = true;

      try {
        await StorageService.syncWithServer();
      } catch (err) {
        console.debug('Background sync update error:', err);
      } finally {
        this.isSyncing = false;
      }

      // Dispatch local window events for all listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('catalog-updated', { detail: { event, data } }));
        window.dispatchEvent(new CustomEvent('storage-sync-completed', { detail: { event, data } }));
        if (event.includes('niche')) {
          window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
        }
        if (event.includes('item')) {
          window.dispatchEvent(new CustomEvent('items-updated'));
        }
        if (event.includes('production')) {
          window.dispatchEvent(new CustomEvent('production-updated', { detail: { event, data } }));
        }
      }

      // Notify internal subscribers
      for (const cb of this.callbacks) {
        try {
          cb(event, data);
        } catch (e) {
          console.error('Error in sync subscriber:', e);
        }
      }
    }, 120);

    // Forward to other local tabs if received from network
    if (fromNetwork && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: event, data });
      } catch {}
    }
  }

  /**
   * Broadcast a change immediately to all tabs and to the central server
   */
  public broadcastLocalAndRemote(event: string = 'catalog-updated', data?: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: event, data });
      } catch {}
    }
    api.notifySync(event, data).catch(() => {});
  }
}

export const realtimeSync = new RealtimeSyncManager();

export function initRealtimeSync(callback?: SyncCallback): () => void {
  return realtimeSync.subscribe((event, data) => {
    if (callback) {
      callback(event, data);
    }
  });
}
