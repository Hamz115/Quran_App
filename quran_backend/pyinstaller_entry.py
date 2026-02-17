"""
PyInstaller entrypoint for QuranTrack FastAPI backend.
Handles frozen-mode quirks: stdout redirect, freeze_support, parent watcher.
"""
import sys
import os
import multiprocessing


def watch_parent():
    """Kill this process if the parent (Tauri) dies — prevents orphan sidecar."""
    import threading
    import time
    import ctypes

    parent_pid = os.getppid()
    kernel32 = ctypes.windll.kernel32

    def _watch():
        while True:
            # On Windows, open the process handle to check if it's still alive
            handle = kernel32.OpenProcess(0x100000, False, parent_pid)  # SYNCHRONIZE
            if handle:
                kernel32.CloseHandle(handle)
            else:
                os._exit(0)  # Parent died, exit immediately
            time.sleep(2)

    threading.Thread(target=_watch, daemon=True).start()


def main():
    multiprocessing.freeze_support()  # Required on Windows or exe spawns infinite children

    # In --noconsole mode, stdout/stderr are None — uvicorn's logger crashes.
    # Redirect to a log file before importing uvicorn.
    if getattr(sys, 'frozen', False):
        log_path = os.path.join(os.path.dirname(sys.executable), 'backend.log')
        log_file = open(log_path, 'w', buffering=1)
        sys.stdout = log_file
        sys.stderr = log_file

        # Start parent watcher to prevent orphan process
        watch_parent()

    import uvicorn
    from main import app

    uvicorn.run(app, host="127.0.0.1", port=8000, workers=1)


if __name__ == "__main__":
    main()
