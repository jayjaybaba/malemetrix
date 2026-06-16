"""Erzeugt das MaleMetrix Open-Graph-Bild (1200x630 PNG)."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
img = Image.new("RGB", (W, H), (7, 9, 13))
d = ImageDraw.Draw(img, "RGBA")

# --- Hintergrund-Verlauf (dunkel, oben minimal heller) ---
for y in range(H):
    t = y / H
    r = int(11 + (7 - 11) * t)
    g = int(14 + (9 - 14) * t)
    b = int(20 + (13 - 20) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# --- Blau-Glow oben rechts ---
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
cx, cy = 980, 90
for rad in range(520, 0, -8):
    a = int(46 * (1 - rad / 520) ** 2)
    gd.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(46, 124, 246, a))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
d = ImageDraw.Draw(img, "RGBA")

# --- dezentes Gitter ---
for x in range(0, W, 60):
    d.line([(x, 0), (x, H)], fill=(255, 255, 255, 6))
for y in range(0, H, 60):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 6))


def font(path_list, size):
    for p in path_list:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


FW = r"C:\Windows\Fonts"
bold = lambda s: font([os.path.join(FW, "segoeuib.ttf"), os.path.join(FW, "arialbd.ttf")], s)
reg = lambda s: font([os.path.join(FW, "segoeui.ttf"), os.path.join(FW, "arial.ttf")], s)
mono = lambda s: font([os.path.join(FW, "consola.ttf"), os.path.join(FW, "cour.ttf")], s)

PAD = 80
ACCENT = (46, 124, 246)
ACCENT2 = (0, 194, 255)
WHITE = (238, 242, 247)
GRAY = (154, 164, 181)
GREEN = (45, 212, 167)


def grad_h(w, h, c1, c2):
    g = Image.new("RGB", (w, h), c1)
    gd = ImageDraw.Draw(g)
    for x in range(w):
        t = x / max(1, w - 1)
        gd.line([(x, 0), (x, h)], fill=(
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t)))
    return g


# --- Logo-Mark (abgerundetes Quadrat mit Verlauf + Daten-M) ---
mark = grad_h(64, 64, ACCENT, ACCENT2)
mask = Image.new("L", (64, 64), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 63, 63], radius=16, fill=255)
img.paste(mark, (PAD, 70), mask)
md = ImageDraw.Draw(img, "RGBA")
ox, oy = PAD, 70
mpts = [(ox + 18, oy + 46), (ox + 18, oy + 20), (ox + 32, oy + 34), (ox + 46, oy + 20), (ox + 46, oy + 46)]
md.line(mpts, fill=(255, 255, 255), width=5, joint="curve")
for pt in [(ox + 18, oy + 20), (ox + 46, oy + 20)]:
    md.ellipse([pt[0] - 3.5, pt[1] - 3.5, pt[0] + 3.5, pt[1] + 3.5], fill=(255, 255, 255))
md.ellipse([ox + 32 - 3, oy + 34 - 3, ox + 32 + 3, oy + 34 + 3], fill=(191, 233, 255))

# Wortmarke
wf = bold(34)
x = PAD + 80
d.text((x, 84), "Male", font=wf, fill=WHITE)
mw = d.textbbox((0, 0), "Male", font=wf)
d.text((x + (mw[2] - mw[0]), 84), "Metrix", font=wf, fill=ACCENT2)

# --- Headline ---
hf = bold(70)
d.text((PAD, 210), "Das Performance-System", font=hf, fill=WHITE)
d.text((PAD, 290), "für ", font=hf, fill=WHITE)
fw = d.textbbox((0, 0), "für ", font=hf)
# "alle Männer." im Akzent
seg = grad_h(560, 80, ACCENT, ACCENT2)
segmask = Image.new("L", (560, 80), 0)
ImageDraw.Draw(segmask).text((0, 0), "alle Männer.", font=hf, fill=255)
img.paste(seg, (PAD + (fw[2] - fw[0]), 290), segmask)
d = ImageDraw.Draw(img, "RGBA")

# Akzent-Unterstrich
d.rounded_rectangle([PAD, 392, PAD + 120, 398], radius=3, fill=ACCENT)

# --- Subline ---
sf = reg(32)
d.text((PAD, 430), "Bauchfett runter. Kraft rauf. Energie zurück. Struktur rein.", font=sf, fill=GRAY)

# --- Feature-Zeile ---
ff = mono(24)
d.text((PAD, 486), "Score-Check  ·  19 Rechner  ·  Training-Tracker  ·  Ebooks  ·  Coaching", font=ff, fill=(120, 200, 255))

# --- „100% kostenlos starten“ Pille ---
pill_f = bold(24)
pt = "100 % KOSTENLOS STARTEN"
ptb = d.textbbox((0, 0), pt, font=pill_f)
pw, ph = ptb[2] - ptb[0], ptb[3] - ptb[1]
px, py = PAD, 545
d.rounded_rectangle([px, py, px + pw + 44, py + ph + 26], radius=24, fill=(45, 212, 167, 28), outline=(45, 212, 167, 160), width=2)
d.text((px + 22, py + 13 - ptb[1]), pt, font=pill_f, fill=GREEN)

# --- URL rechts unten ---
uf = mono(26)
ut = "malemetrix.de"
utb = d.textbbox((0, 0), ut, font=uf)
d.text((W - PAD - (utb[2] - utb[0]), 560), ut, font=uf, fill=GRAY)

img.save(r"C:\Users\uralb\malemetrix\og-image.png", "PNG")
print("OG-Bild erstellt:", img.size)
