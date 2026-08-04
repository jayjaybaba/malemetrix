#!/usr/bin/env python3
# ==========================================================================
#  MaleMetrix — Übungsfotos ins Repo holen
# --------------------------------------------------------------------------
#  Warum überhaupt selbst hosten, statt vom CDN der Quelle zu laden:
#
#  1. DATENSCHUTZ. Ein fremder Bild-Host bekommt die IP-Adresse jedes
#     Besuchers. Diese Seite hostet ihre Schriften genau deshalb lokal
#     (datenschutz.html, Abschnitt 8). Bei Fotos etwas anderes zu tun wäre
#     inkonsequent — und auskunftspflichtig.
#  2. OFFLINE. Der Service Worker fasst fremde Origins bewusst nicht an
#     (sw.js: `url.origin !== location.origin` → return). Vom CDN geladene
#     Bilder landen also NIE im Offline-Cache. Lokale schon, automatisch.
#  3. UNABHÄNGIGKEIT. Ein Kernfeature soll nicht an einem Dienst hängen,
#     über den wir nicht bestimmen.
#
#  Größe: 320 px reichen. Die Kacheln sind 56–64 px, die große Schleife in
#  der Detailansicht ~400 px breit. Bei 320 px WebP kostet das ganze Set
#  ~15 MB statt ~120 MB im Original.
#
#  Aufruf:
#     git clone --depth 1 https://github.com/yuhonas/free-exercise-db.git /tmp/fxdb
#     python3 tools-dev/build-exercise-images.py /tmp/fxdb
#
#  Voraussetzung: Pillow  (pip install Pillow)
#
#  Quelle: free-exercise-db, Lizenz Unlicense (gemeinfrei).
# ==========================================================================

import sys
import pathlib
import shutil

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow fehlt.  →  pip install Pillow")

WIDTH = 320
QUALITY = 76

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "img" / "uebungen"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__ or "Aufruf: build-exercise-images.py <pfad-zum-free-exercise-db-clone>")

    source = pathlib.Path(sys.argv[1]) / "exercises"
    if not source.is_dir():
        sys.exit(f"Kein exercises/-Verzeichnis unter {source}")

    # Sauber neu aufbauen: entfernte Übungen sollen keine Karteileichen
    # hinterlassen, die niemand mehr zuordnen kann.
    if TARGET.exists():
        shutil.rmtree(TARGET)
    TARGET.mkdir(parents=True)

    written = 0
    total = 0
    skipped = []

    for folder in sorted(p for p in source.iterdir() if p.is_dir()):
        for n in (0, 1):
            src = folder / f"{n}.jpg"
            if not src.exists():
                skipped.append(f"{folder.name}/{n}.jpg")
                continue
            im = Image.open(src).convert("RGB")
            im.thumbnail((WIDTH, WIDTH), Image.LANCZOS)
            # Flach abgelegt: ein Verzeichnis statt 873 Unterordnern.
            # Die Slugs enthalten nur [A-Za-z0-9_-] und sind damit sowohl als
            # Dateiname wie als URL-Bestandteil unbedenklich.
            out = TARGET / f"{folder.name}-{n}.webp"
            im.save(out, "WEBP", quality=QUALITY, method=5)
            total += out.stat().st_size
            written += 1

    print(f"Geschrieben : {written} Bilder nach img/uebungen/")
    print(f"Größe       : {total / 1024 / 1024:.1f} MB  (Ø {total / written / 1024:.1f} KB, {WIDTH} px WebP q{QUALITY})")
    if skipped:
        print(f"Übersprungen: {len(skipped)} fehlende Quelldateien — {', '.join(skipped[:5])}"
              + (" …" if len(skipped) > 5 else ""))


if __name__ == "__main__":
    main()
