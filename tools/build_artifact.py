"""Build dist/ for publishing as a claude.ai Artifact.

The Artifact host wraps the page in its own <!doctype>/<head>/<body> skeleton (charset and
viewport included), so this copies index.html without those wrapper tags and copies the
CSS, JS and images beside it. The source index.html stays a normal standalone page.

Usage: python tools/build_artifact.py
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

WRAPPERS = [
    r"<!doctype html>\s*",
    r"<html[^>]*>\s*",
    r"</html>\s*",
    r"<head>\s*",
    r"</head>\s*",
    r"<body[^>]*>\s*",
    r"</body>\s*",
    r'<meta charset="utf-8">\s*',
    r'<meta name="viewport"[^>]*>\s*',
]


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for pattern in WRAPPERS:
        html = re.sub(pattern, "", html, flags=re.IGNORECASE)
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "css").mkdir(parents=True)
    (DIST / "js").mkdir()
    (DIST / "img").mkdir()
    shutil.copytree(ROOT / "assets" / "environments", DIST / "assets" / "environments")
    (DIST / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(ROOT / "css" / "site.css", DIST / "css" / "site.css")
    for script in sorted((ROOT / "js").glob("*.js")):
        shutil.copy2(script, DIST / "js" / script.name)
    for image in sorted((ROOT / "img").iterdir()):
        if image.suffix.lower() in {".jpg", ".png"}:
            shutil.copy2(image, DIST / "img" / image.name)
    files = sorted(p.relative_to(DIST).as_posix() for p in DIST.rglob("*") if p.is_file())
    print(f"dist/ ready: {len(files)} files")
    for f in files:
        print("  " + f)


if __name__ == "__main__":
    main()
