/**
 * Tauri auto-updater integration.
 * Checks GitHub Releases for new versions and prompts the user to install.
 * No-op when running in a regular browser (non-Tauri context).
 */

let isChecking = false;

export async function checkForAppUpdates(onEvent?: (status: UpdateStatus) => void): Promise<void> {
  // Guard: only run inside Tauri desktop app
  if (!(window as any).__TAURI__) return;
  if (isChecking) return;

  isChecking = true;

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { ask } = await import('@tauri-apps/plugin-dialog');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    onEvent?.({ stage: 'checking' });

    const update = await check();

    if (!update) {
      onEvent?.({ stage: 'upToDate' });
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
      onEvent?.({ stage: 'dismissed' });
      return;
    }

    onEvent?.({ stage: 'downloading', progress: 0 });

    let totalLength = 0;
    let downloaded = 0;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started' && event.data.contentLength) {
        totalLength = event.data.contentLength;
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        const pct = totalLength > 0 ? Math.round((downloaded / totalLength) * 100) : 0;
        onEvent?.({ stage: 'downloading', progress: pct });
      } else if (event.event === 'Finished') {
        onEvent?.({ stage: 'installing' });
      }
    });

    onEvent?.({ stage: 'restarting' });
    await relaunch();
  } catch (err) {
    console.error('[updater] Failed to check for updates:', err);
    onEvent?.({ stage: 'error', error: String(err) });
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
