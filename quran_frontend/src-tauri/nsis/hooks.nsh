!macro NSIS_HOOK_PREINSTALL
  ; Kill the QuranTrack sidecar (quran-backend.exe) before file copy.
  ; Safety net in case the JS-side kill didn't work.
  ; taskkill /F = force kill, /IM = match by image name.
  nsExec::ExecToLog 'taskkill /F /IM "quran-backend.exe"'
  Pop $0
!macroend
