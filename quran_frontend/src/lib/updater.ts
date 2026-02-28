/**
 * Tauri auto-updater integration.
 * Checks GitHub Releases for new versions and prompts the user to install.
 * No-op when running in a regular browser (non-Tauri context).
 *
 * Broadcasts update status globally so any component (e.g. UpdateOverlay)
 * can subscribe via onUpdateStatus().
 */

let isChecking = false;

// Global listeners for update status (used by UpdateOverlay in App.tsx)
type StatusListener = (status: UpdateStatus) => void;
const listeners: Set<StatusListener> = new Set();

/** Subscribe to update status changes. Returns unsubscribe function. */
export function onUpdateStatus(fn: StatusListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function broadcast(status: UpdateStatus) {
  listeners.forEach(fn => fn(status));
}

export async function checkForAppUpdates(onEvent?: (status: UpdateStatus) => void): Promise<void> {
  // Guard: only run inside Tauri desktop app
  if (!(window as any).__TAURI_INTERNALS__) return;
  if (isChecking) return;

  isChecking = true;

  const emit = (status: UpdateStatus) => {
    onEvent?.(status);
    broadcast(status);
  };

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { ask } = await import('@tauri-apps/plugin-dialog');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    emit({ stage: 'checking' });

    const update = await check();

    if (!update) {
      emit({ stage: 'upToDate' });
      return;
    }

    const userConfirmed = await ask(
      `A new version (${update.version}) is available.\n\nWould you like to update now?`,
      {
        title: 'Update Available',
        kind: 'info',
        okLabel: 'Update Now',
        cancelLabel: 'Later',
      }
    );

    if (!userConfirmed) {
      emit({ stage: 'dismissed' });
      return;
    }

    // Kill the backend sidecar BEFORE downloadAndInstall —
    // the install phase runs the NSIS installer which needs the file unlocked
    emit({ stage: 'downloading', progress: 0 });
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_sidecar');
    } catch (err) {
      console.warn('[updater] Failed to kill sidecar (non-blocking):', err);
    }

    let totalLength = 0;
    let downloaded = 0;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started' && event.data.contentLength) {
        totalLength = event.data.contentLength;
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        const pct = totalLength > 0 ? Math.round((downloaded / totalLength) * 100) : 0;
        emit({ stage: 'downloading', progress: pct });
      } else if (event.event === 'Finished') {
        emit({ stage: 'installing' });
      }
    });

    emit({ stage: 'restarting' });
    await relaunch();
  } catch (err) {
    console.error('[updater] Failed to check for updates:', err);
    emit({ stage: 'error', error: String(err) });
  } finally {
    isChecking = false;
  }
}

export type UpdateStatus =
  | { stage: 'checking' }
  | { stage: 'upToDate' }
  | { stage: 'downloading'; progress: number }
  | { stage: 'installing' }
  | { stage: 'restarting' }
  | { stage: 'dismissed' }
  | { stage: 'error'; error: string };
