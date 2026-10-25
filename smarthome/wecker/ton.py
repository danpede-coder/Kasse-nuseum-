# Sanfter Weckton: warmer Akkord-Pad, Glocken (Pentatonik), leise Vogelstimmen; 3 min, Fade-in
import numpy as np, wave
SR = 44100; T = 180
t = np.arange(SR * T) / SR
rng = np.random.default_rng(5)
out = np.zeros_like(t)
# Pad: D-Dur-Akkord, langsam atmend
for f, a in ((146.83, .5), (220.0, .35), (293.66, .3), (369.99, .2)):
    out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 11 + rng.uniform(0, 6)))
out *= 0.12
# Glocken
notes = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66]
n = 0.0
while n < T - 3:
    f = rng.choice(notes); i0 = int(n * SR); L = int(3 * SR)
    tt = np.arange(L) / SR
    env = np.exp(-tt * 2.2) * (1 - np.exp(-tt * 200))
    bell = np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3)
    out[i0:i0 + L] += 0.18 * env * bell * min(1, n / 40 + .3)
    n += rng.uniform(1.2, 3.5)
# Vogelstimmen ab 60 s
n = 60.0
while n < T - 1:
    i0 = int(n * SR); L = int(rng.uniform(.08, .18) * SR); tt = np.arange(L) / SR
    f0 = rng.uniform(2800, 4200); sweep = f0 + rng.uniform(-900, 900) * tt / tt[-1]
    ph = 2 * np.pi * np.cumsum(sweep) / SR
    chirp = np.sin(ph) * np.sin(np.pi * tt / tt[-1]) ** 2
    out[i0:i0 + L] += 0.05 * chirp
    n += rng.choice([.15, .2, .25, 2.5, 4.0])
# Fade-in 45 s, Fade-out 5 s, Normalisieren
out *= np.clip(t / 45, 0.05, 1) * np.clip((T - t) / 5, 0, 1)
out = out / np.abs(out).max() * 0.8
with wave.open('wecker.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
