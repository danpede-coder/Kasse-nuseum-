# Blitz-Ebenen: "dim" versteckt die Blitze im Bild, "hell"/"mittel" je Blitz (links/rechts) mit Leuchten
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32) / 255
ov = np.asarray(Image.open(sys.argv[2]).convert("RGBA")).astype(np.float32) / 255
out = sys.argv[3]
H, W, _ = src.shape
m = ov[..., 3]
m = np.where(m > 0.04, m, 0)

# --- dim: Blitzbereich mit Umgebung fuellen (normalisierte Faltung) ---
hide = ndi.gaussian_filter((ndi.binary_dilation(m > 0.08, iterations=6)).astype(np.float32), 3).clip(0, 1)
keep = 1 - (ndi.binary_dilation(m > 0.03, iterations=8)).astype(np.float32)
fill = np.zeros_like(src)
for c in range(3):
    num = ndi.gaussian_filter(src[..., c] * keep, 14)
    den = ndi.gaussian_filter(keep, 14)
    fill[..., c] = num / np.maximum(den, 1e-4)
# feines Wolkenrauschen, damit die Flaeche nicht glatt wirkt
rng = np.random.default_rng(3)
noise = ndi.gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 2) * 0.025
fill = (fill + noise[..., None]).clip(0, 1)
dim = np.dstack([fill * (hide[..., None] > 0), hide])
Image.fromarray((dim * 255).astype(np.uint8)).save(f"{out}/blitz_dim.png", optimize=True)

# --- hell: Kern weiss-violett, Glow in zwei Stufen ---
def bright(mask, gain):
    core = ((mask - 0.12) * 1.8).clip(0, 1)
    g1 = ndi.gaussian_filter(core, 2) * 0.9
    g2 = ndi.gaussian_filter(core, 9) * 1.1
    g3 = ndi.gaussian_filter(core, 30) * 1.6
    light = (core[..., None] * np.array([1.0, 0.98, 1.0])
             + g1[..., None] * np.array([0.92, 0.88, 1.0])
             + g2[..., None] * np.array([0.72, 0.62, 1.0])
             + g3[..., None] * np.array([0.5, 0.42, 0.85])) * gain
    a = light.max(-1).clip(0, 1)
    rgb = light / np.maximum(a[..., None], 1e-4) * (a[..., None] > 0)
    return np.dstack([rgb.clip(0, 1), a])

xx = np.arange(W)[None, :]
for side, sel in (("l", xx < W * 0.5), ("r", xx >= W * 0.5)):
    ms = m * sel
    for name, gain in (("hell", 1.0), ("mittel", 0.4)):
        img = bright(ms, gain)
        Image.fromarray((img * 255).astype(np.uint8)).save(f"{out}/blitz_{side}_{name}.png", optimize=True)

# Vorschau: Bild mit dim (nach Abdunkelung) + beide hell
def comp(base, layer):
    a = layer[..., 3:4]
    return base * (1 - a) + layer[..., :3] * a
dark = lambda x: x * 0.55 + 0.45 * 12 / 255
idle = dark(comp(src, dim))
Image.fromarray((idle * 255).astype(np.uint8)).save(f"{out}/vorschau_ruhe.jpg", quality=85)
flash = idle
for side in "lr":
    flash = comp(flash, np.asarray(Image.open(f"{out}/blitz_{side}_hell.png")).astype(np.float32) / 255)
Image.fromarray((flash * 255).astype(np.uint8)).save(f"{out}/vorschau_blitz.jpg", quality=85)
print("ok")
