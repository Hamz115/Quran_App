/**
 * Tauri auto-updater integration.
 * Checks GitHub Releases for new versions and prompts the user to install.
 * No-op when running in a regular browser (non-Tauri context).
 *
 * Broadcasts update status globally so any component (e.g. UpdateOverlay)
 * can subscribe via onUpdateStatus().
 */

let isChecking = false;
let cancelRequested = false;

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

/** Called by the Cancel button in UpdateOverlay */
export function cancelUpdate() {
  cancelRequested = true;
  broadcast({ stage: 'cancelled' });
}

export async function checkForAppUpdates(onEvent?: (status: UpdateStatus) => void): Promise<void> {
  // Guard: only run inside Tauri desktop app
  if (!(window as any).__TAURI_INTERNALS__) return;
  if (isChecking) return;

  isChecking = true;
  cancelRequested = false;

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

    // Show downloading overlay — sidecar is still running, app is functional
    emit({ stage: 'downloading', progress: -1, downloadedBytes: 0 });

    // Download timeout: 90 seconds with no progress = abort
    let lastProgressTime = Date.now();
    const TIMEOUT_MS = 90_000;

    let totalLength = 0;
    let downloaded = 0;

    const timeoutCheck = setInterval(() => {
      if (cancelRequested) {
        clearInterval(timeoutCheck);
        return;
      }
      if (Date.now() - lastProgressTime > TIMEOUT_MS) {
        clearInterval(timeoutCheck);
        emit({ stage: 'error', error: 'Download timed out. Please try again later.' });
        isChecking = false;
      }
    }, 5000);

    try {
      await update.downloadAndInstall((event) => {
        if (cancelRequested) return;

        lastProgressTime = Date.now();

        if (event.event === 'Started' && event.data.contentLength) {
          totalLength = event.data.contentLength;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          // If we know total length, show percentage; otherwise show -1 (indeterminate)
          const pct = totalLength > 0 ? Math.round((downloaded / totalLength) * 100) : -1;
          emit({ stage: 'downloading', progress: pct, downloadedBytes: downloaded });
        } else if (event.event === 'Finished') {
          clearInterval(timeoutCheck);
          emit({ stage: 'installing' });
        }
      });
    } finally {
      clearInterval(timeoutCheck);
    }

    if (cancelRequested) {
      return;
    }

    // Kill the backend sidecar NOW — right before install/relaunch
    // The download is done, installer needs the file unlocked
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_sidecar');
      // Give Windows time to fully release file handles
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.warn('[updater] Failed to kill sidecar (non-blocking):', err);
    }

    emit({ stage: 'restarting' });
    await relaunch();
  } catch (err) {
    if (!cancelRequested) {
      console.error('[updater] Failed to check for updates:', err);
      emit({ stage: 'error', error: String(err) });
    }
  } finally {
    isChecking = false;
    cancelRequested = false;
  }
}

export type UpdateStatus =
  | { stage: 'checking' }
  | { stage: 'upToDate' }
  | { stage: 'downloading'; progress: number; downloadedBytes: number }
  | { stage: 'installing' }
  | { stage: 'restarting' }
  | { stage: 'dismissed' }
  | { stage: 'cancelled' }
  | { stage: 'error'; error: string };
