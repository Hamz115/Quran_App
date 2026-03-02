!macro NSIS_HOOK_PREINSTALL
  ; Kill the QuranTrack sidecar (quran-backend.exe) before file copy.
  ; This prevents "Error opening file for writing" during auto-update.
  ; taskkill /F = force kill, /IM = match by image name.
  ; nsExec runs without showing a command prompt window.
  nsExec::ExecToLog 'taskkill /F /IM "quran-backend.exe"'
  Pop $0

  ; Wait for the OS to fully release file handles
  Sleep 2000
!macroend
