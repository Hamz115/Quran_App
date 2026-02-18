# Agent 1: QPC Fonts — Offline Font Bundling

**Phase:** A
**Depends on:** Nothing (starts immediately, runs in parallel with Agent 2)
**Blocks:** Agent 4 (Docs) needs to know when this finishes

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- If you encounter any issue with `pubspec.yaml` that might affect Agent 2 or 3 (e.g. dependency conflicts) → message them immediately
- When done → message Agent 4: "Phase A complete. Files created/modified: [list]. Any issues: [list]"
- If Agent 2 or 3 messages you about a conflict with files you own → respond and coordinate

## Objective

Eliminate the Flutter app's HTTP dependency for QPC fonts. Currently `QpcFontService` downloads 604 TTF files from the FastAPI backend. After this agent's work, fonts load from bundled Flutter assets — fully offline.

## Reference

- **Full plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` → "Part 1: Bundle QPC Fonts Locally"
- **Web reference for font naming:** `quran_backend/fonts/qpc/QCF_P001.ttf` through `QCF_P604.ttf`

## Tasks

- [ ] **A1.** Copy 604 TTF files from `quran_backend/fonts/qpc/` to `quran_mobile/assets/fonts/qpc/`
  - Files: `QCF_P001.ttf` through `QCF_P604.ttf`
  - Total: 604 files, ~92MB
  - Command: `cp -r quran_backend/fonts/qpc/ quran_mobile/assets/fonts/qpc/`

- [ ] **A2.** Update `quran_mobile/pubspec.yaml` — add `assets/fonts/qpc/` to the assets list
  ```yaml
  flutter:
    assets:
      - assets/databases/
      - assets/images/
      - assets/quran-pages/
      - assets/fonts/qpc/     # NEW
      - .env
  ```

- [ ] **A3.** Rewrite `quran_mobile/lib/core/services/qpc_font_service.dart`
  - Replace `_downloadFontMobile()` with `_loadFontFromAssets()` that uses `rootBundle.load()`
  - Keep `_downloadFontWeb()` unchanged (web still uses HTTP)
  - The `_loadFont()` method should branch: `kIsWeb ? _downloadFontWeb() : _loadFontFromAssets()`
  - New method:
    ```dart
    Future<Uint8List> _loadFontFromAssets(int pageNum) async {
      final padded = pageNum.toString().padLeft(3, '0');
      final byteData = await rootBundle.load('assets/fonts/qpc/QCF_P$padded.ttf');
      return byteData.buffer.asUint8List();
    }
    ```

- [ ] **A4.** Remove the conditional import of `qpc_font_io_mobile.dart` from `qpc_font_service.dart`
  - The `import 'qpc_font_io_stub.dart' if (dart.library.io) 'qpc_font_io_mobile.dart'` line is no longer needed for the mobile font path
  - The `_cacheDir` field and `font_io` usage can be removed

- [ ] **A5.** Simplify `quran_mobile/lib/core/services/qpc_font_io_mobile.dart`
  - The disk cache functions (`getFontCacheDir`, `readFileIfExists`, `writeFile`) are no longer needed
  - Either delete the file or add a comment that it's unused
  - Check if anything else imports it first (grep for `qpc_font_io`)

- [ ] **A6.** Update `quran_mobile/lib/presentation/providers/quran_page_provider.dart`
  - Simplify the `qpcFontServiceProvider` — mobile no longer needs `apiClient.baseUrl`
  - Change to: `final baseUrl = kIsWeb ? 'http://localhost:8000/api' : '';`

- [ ] **A7.** Verify the build compiles
  - Run `cd quran_mobile && flutter pub get`
  - Ensure no import errors or missing asset errors

## Files Touched

| File | Action |
|---|---|
| `quran_mobile/assets/fonts/qpc/*.ttf` | CREATE (604 files copied) |
| `quran_mobile/pubspec.yaml` | MODIFY (add asset path) |
| `quran_mobile/lib/core/services/qpc_font_service.dart` | MODIFY (replace HTTP with rootBundle) |
| `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` | MODIFY/DELETE (no longer needed) |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | MODIFY (simplify baseUrl) |

## Key Constraints

- Font family naming must stay `QPC-Page-$pageNum` (e.g. `QPC-Page-1`, `QPC-Page-604`) — widgets depend on this
- File naming convention: `QCF_P{NNN}.ttf` with zero-padded 3-digit page numbers
- Do NOT change the web path (`_downloadFontWeb`) — only the mobile path changes
- Page 586 has overflow glyphs — ensure adjacent page font loading (`ensureFontsForPage` loads page-1, page, page+1) still works

## Done Signal

When all tasks are complete, notify Agent 4 (Docs) by marking tasks complete. Agent 4 will update the session log and implementation plan.
