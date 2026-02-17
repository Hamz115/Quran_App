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
    if parent_pid <= 0:
        return  # No valid parent PID, skip watcher

    kernel32 = ctypes.windll.kernel32
    # PROCESS_QUERY_LIMITED_INFORMATION (0x1000) — least-privilege access
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

    # Verify we can actually open the parent before starting the watcher
    test_handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, parent_pid)
    if not test_handle:
        return  # Can't access parent process, skip watcher (Tauri handles cleanup)
    kernel32.CloseHandle(test_handle)

    def _watch():
        while True:
            time.sleep(3)
            handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, parent_pid)
            if handle:
                kernel32.CloseHandle(handle)
            else:
                os._exit(0)  # Parent died, exit immediately

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
