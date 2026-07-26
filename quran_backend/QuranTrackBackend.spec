# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for QuranTrack FastAPI backend sidecar.
Builds a single exe that Tauri launches as a sidecar process.

Build: pyinstaller QuranTrackBackend.spec
Output: dist/QuranTrackBackend.exe
"""
from PyInstaller.utils.hooks import collect_submodules

# --- Hidden imports ---
# PyInstaller misses dynamic imports in FastAPI/uvicorn/supabase
hiddenimports = []
hiddenimports += collect_submodules('uvicorn')
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('starlette')
hiddenimports += collect_submodules('jose')
hiddenimports += collect_submodules('passlib')
hiddenimports += collect_submodules('supabase')
hiddenimports += collect_submodules('gotrue')
hiddenimports += collect_submodules('postgrest')
hiddenimports += collect_submodules('storage3')
hiddenimports += collect_submodules('realtime')
hiddenimports += collect_submodules('httpx')
hiddenimports += collect_submodules('playwright')
hiddenimports += [
    'bcrypt',
    'multipart',
    'dotenv',
    'email_validator',
    'jwt',
    'fonttools',
    'brotli',
    'sqlite3',
    'asyncio',
    'concurrent.futures',
]

# --- Data files to bundle (read-only) ---
datas = [
    ('quran.db', '.'),
    ('qpc-v2-15-lines.db', '.'),
    ('qpc-v2.db', '.'),
    # The packaged client may contain only the public Supabase URL/anon key.
    # Never bundle quran_backend/.env: it contains privileged server credentials.
    ('../quran_frontend/.env.local', '.env.public'),
    # NOTE: app.db is NOT bundled — it's read-write and lives next to the exe
    # NOTE: QPC fonts are NOT bundled here — they're in the frontend public/ dir
    # NOTE: quran-pages/ (v1 JSON) no longer needed — replaced by v2 SQLite DBs
]

# --- Exclude unnecessary packages to reduce size ---
excludes = [
    'tkinter', 'matplotlib', 'numpy', 'scipy', 'pandas',
    'PIL', 'cv2', 'test',
]

a = Analysis(
    ['pyinstaller_entry.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='QuranTrackBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,       # No console window (headless sidecar)
    icon=None,
)
