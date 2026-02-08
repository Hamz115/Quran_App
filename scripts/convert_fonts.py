"""
Convert QPC .woff2 fonts to .ttf for Flutter mobile app.
Input:  quran_frontend/public/fonts/qpc/QCF_P001.woff2 ... QCF_P604.woff2
Output: quran_backend/fonts/qpc/QCF_P001.ttf ... QCF_P604.ttf

Requirements: pip install fonttools brotli
"""

import os
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print("Error: fonttools not installed. Run: pip install fonttools brotli")
    sys.exit(1)

# Paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent
INPUT_DIR = PROJECT_ROOT / "quran_frontend" / "public" / "fonts" / "qpc"
OUTPUT_DIR = PROJECT_ROOT / "quran_backend" / "fonts" / "qpc"

def convert_fonts():
    if not INPUT_DIR.exists():
        print(f"Error: Input directory not found: {INPUT_DIR}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    converted = 0
    skipped = 0
    errors = 0

    for page in range(1, 605):
        padded = f"{page:03d}"
        input_file = INPUT_DIR / f"QCF_P{padded}.woff2"
        output_file = OUTPUT_DIR / f"QCF_P{padded}.ttf"

        if not input_file.exists():
            print(f"  SKIP: {input_file.name} (not found)")
            skipped += 1
            continue

        if output_file.exists():
            converted += 1
            continue

        try:
            font = TTFont(str(input_file))
            font.flavor = None  # Remove woff2 compression
            font.save(str(output_file))
            font.close()
            converted += 1
            if page % 50 == 0 or page == 1:
                print(f"  Converted page {page}/604")
        except Exception as e:
            print(f"  ERROR: Page {page}: {e}")
            errors += 1

    print(f"\nDone! Converted: {converted}, Skipped: {skipped}, Errors: {errors}")
    print(f"Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    print("Converting QPC fonts from .woff2 to .ttf...")
    convert_fonts()
