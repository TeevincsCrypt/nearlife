import numpy as np, wave, json
from scipy.signal import butter, sosfilt, fftconvolve
SR = 48000; DUR = 48.5; N = int(SR * DUR)
rng = np.random.default_rng(7)
def T(sec): return np.arange(int(sec * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def put(buf, x, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[:j - i] * g
def midi(n): return 440 * 2 ** ((n - 69) / 12)

# ---------- instruments ----------
def pluck(f, d=0.55, bright=1.0):
    t = T(d); env = np.exp(-t * 7) * np.minimum(1, t / 0.004)
    x = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t + k) for k in range(5))
    return lp(x * env, 2600 * bright) * 0.5
def pad(f, d):
    t = T(d); env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.4)
    x = sum(np.sin(2 * np.pi * f * m * t + rng.random() * 6) for m in (0.997, 1.0, 1.004, 2.002)) / 4
    x += 0.25 * sum(np.sin(2 * np.pi * f * 3 * m * t) for m in (0.998, 1.003)) / 2
    return x * env * 0.35
def bass(f, d=0.24):
    t = T(d); env = np.exp(-t * 6) * np.minimum(1, t / 0.005)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(x * env, 900) * 0.55
def kick():
    t = T(0.35); f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 9) + 0.3 * np.exp(-t * 300) * rng.standard_normal(len(t))) * 0.9
def clap():
    t = T(0.22); n = rng.standard_normal(len(t))
    env = np.exp(-t * 22) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0))
    return bp(n * env, 900, 4500) * 0.5
def hat(o=False):
    t = T(0.18 if o else 0.05); n = rng.standard_normal(len(t))
    return hp(n * np.exp(-t * (18 if o else 70)), 7000) * 0.22
def bell(f, d=1.4):
    t = T(d); env = np.exp(-t * 3.2)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)) * env * 0.3

# ---------- music ----------
L = np.zeros(N); R = np.zeros(N)
BEAT = 0.5; START = 1.75   # bars start at 1.75 + 2k ; drop at 9.75
DROP = 9.75; END_HIT = 43.2
# key of F major, I-V-vi-IV : F C Dm Bb
CH = [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]]
BASS = [41, 36, 38, 34]
def bar_chord(b): return b % 4

# intro pad + sparse plucks (0 - 9.75)
for k, t0 in enumerate(np.arange(-0.25, DROP, 2.0)):
    c = CH[bar_chord(k)]
    for n in c[1:]:
        x = pad(midi(n), 2.2); put(L, x, max(0, t0), 0.5); put(R, x, max(0, t0), 0.5)
for i, t0 in enumerate(np.arange(START, DROP - 0.1, BEAT / 2)):
    k = int((t0 - START) // 2); c = CH[bar_chord(k + 1)]
    n = c[[0, 2, 1, 3, 2, 3, 1, 2][i % 8]] + 12
    x = pluck(midi(n), 0.45, 0.7); g = 0.16 + 0.1 * (t0 > 6.9)
    put(L, x, t0, g * (0.7 if i % 2 else 1)); put(R, x, t0, g * (1 if i % 2 else 0.7))
# riser into the drop
t = T(2.6); sweep = bp(rng.standard_normal(len(t)), 300, 6000) * (t / 2.6) ** 2.2 * 0.35
put(L, sweep, DROP - 2.6); put(R, sweep, DROP - 2.6)
for i, t0 in enumerate(np.arange(DROP - 1.0, DROP, 0.125)):
    put(L, clap(), t0, 0.25 + i * 0.05); put(R, clap(), t0, 0.25 + i * 0.05)

# groove (drop -> end hit)
for b, t0 in enumerate(np.arange(DROP, END_HIT - 0.01, 2.0)):
    c = CH[bar_chord(b)]; quiet = 1.0
    for n in c[1:]:
        x = pad(midi(n), 2.05); put(L, x, t0, 0.42); put(R, x, t0, 0.42)
    for q in range(4):
        tb = t0 + q * BEAT
        if tb >= END_HIT - 0.05: break
        put(L, kick(), tb, 0.8); put(R, kick(), tb, 0.8)
        if q in (1, 3): put(L, clap(), tb, 0.45); put(R, clap(), tb, 0.5)
        put(L, hat(q == 3), tb + BEAT / 2, 0.8); put(R, hat(q == 3), tb + BEAT / 2, 1.0)
        put(L, hat(), tb, 0.35); put(R, hat(), tb, 0.45)
        for e in (0, 1):
            bn = BASS[bar_chord(b)] + (12 if (q == 3 and e == 1) else 0)
            x = bass(midi(bn)); put(L, x, tb + e * BEAT / 2, 0.8); put(R, x, tb + e * BEAT / 2, 0.8)
    for i in range(16):
        tb = t0 + i * BEAT / 4
        if tb >= END_HIT - 0.05: break
        n = c[[0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2][i]] + 12 + (12 if i in (3, 11) else 0)
        x = pluck(midi(n), 0.4); put(L, x, tb, 0.13 if i % 2 else 0.18); put(R, x, tb, 0.18 if i % 2 else 0.13)

# end: big hit + ringing chord + bells
t = T(5.3); env = np.exp(-t * 0.65)
for n in [41, 53, 57, 60, 65, 69, 72]:
    x = pad(midi(n), 5.3) * env * 1.6; put(L, x, END_HIT, 0.5); put(R, x, END_HIT, 0.5)
put(L, kick(), END_HIT, 1.0); put(R, kick(), END_HIT, 1.0)
cr = hp(rng.standard_normal(int(2.5 * SR)), 5000) * np.exp(-T(2.5) * 2.2) * 0.25
put(L, cr, END_HIT); put(R, cr, END_HIT, 0.9)
for i, n in enumerate([77, 81, 84, 89]):
    put(L, bell(midi(n)), END_HIT + 0.35 + i * 0.18, 0.5); put(R, bell(midi(n)), END_HIT + 0.35 + i * 0.18, 0.6)
# tiny breather: drop drums under the "So... what if" line is already intro

music = np.stack([L, R])
# simple reverb on music
ir = rng.standard_normal(int(1.6 * SR)) * np.exp(-T(1.6) * 4.0); ir = lp(ir, 5000) * 0.03
music = music + np.stack([fftconvolve(music[0], ir)[:N], fftconvolve(music[1], ir[::-1].copy() * 0 + ir)[:N]]) * 0.6

# ---------- sfx ----------
S = np.zeros((2, N))
def sput(x, t, g=1.0, pan=0.0):
    put(S[0], x, t, g * (1 - max(0, pan))); put(S[1], x, t, g * (1 + min(0, pan)))
def whoosh(d=0.55):
    t = T(d); n = rng.standard_normal(len(t)); env = np.sin(np.pi * t / d) ** 2
    lo = bp(n, 400, 2500) * env; return lp(lo, 3000) * 0.5
def pop(f=900):
    t = T(0.14); fr = f * (1 + 0.8 * np.exp(-t * 40)); ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * np.exp(-t * 30) * 0.45
def clunk():
    t = T(0.25); return (np.sin(2 * np.pi * 180 * t) * np.exp(-t * 25) + bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 60) * 0.5) * 0.6
def shimmer(d=1.4):
    out = np.zeros(int(d * SR))
    for i in range(10):
        b = bell(midi(84 + [0, 4, 7, 12, 16, 19, 24, 19, 16, 12][i]), 0.9) * 0.6; put(out, b, i * 0.07)
    return out
def click():
    t = T(0.04); return hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 200) * 0.6
def chime():
    out = np.zeros(int(1.6 * SR))
    for i, n in enumerate([72, 76, 79, 84]): put(out, bell(midi(n), 1.3), i * 0.09, 0.9)
    return out
def impact():
    t = T(1.2); return (kick()[:len(t)] if False else 0) + lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 5) * 0.6

for t0 in [3.35, 6.95, 9.7, 14.05, 17.65, 22.5, 28.5, 32.5, 36.9, 42.5]:
    sput(whoosh(), t0 - 0.25, 0.55)
html = open('/tmp/claude-0/reveal/site/index.html').read()
import re
# pops at each chip / tile / card entrance (parse simple call sites)
pops = []
for m in re.finditer(r'\b(chip|card)\(([\d.]+)', html): pops.append(float(m.group(2)))
pops += [0.35, 0.57, 0.79, 7.1, 9.85, 10.55, 37.05, 43.0] + [33.3 + i * 0.12 for i in range(14)]
for i, t0 in enumerate(sorted(set(pops))):
    sput(pop(700 + (i * 137) % 600), t0 + 0.05, 0.5, pan=((i % 5) - 2) * 0.25)
for i in range(3): sput(clunk(), 4.5 + i * 0.25, 0.7)
for t0 in [10.0, 39.5, 44.0]: sput(shimmer(), t0, 0.5)
sput(impact(), 9.85, 0.8)
sput(click(), 39.2, 0.8); sput(chime(), 39.5, 0.6)

# ---------- voice ----------
V = np.zeros(N)
starts = [0.35, 3.45, 7.05, 9.8, 14.2, 17.8, 22.6, 28.65, 32.65, 37.05, 42.7]
import subprocess
spans = []
for i, t0 in enumerate(starts):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'/tmp/claude-0/reveal/vo/vo{i:02d}.wav', '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'], capture_output=True).stdout
    v = np.frombuffer(raw, np.float32).astype(np.float64)
    v = v / (np.abs(v).max() + 1e-9) * 0.9
    put(V, v, t0); spans.append((t0, t0 + len(v) / SR))
# voice polish: gentle highpass, presence lift, light compression, a touch of room
V = hp(V, 90)
V = V + 0.18 * bp(V, 2500, 6000)
V = np.tanh(V * 1.6) / np.tanh(1.6)
vir = rng.standard_normal(int(0.35 * SR)) * np.exp(-T(0.35) * 14) * 0.02
V = V + fftconvolve(V, vir)[:N] * 0.5

# ---------- duck music under voice ----------
duck = np.ones(N)
for a, b in spans:
    i, j = int((a - 0.12) * SR), int((b + 0.15) * SR); duck[max(0, i):j] = 0.24
k = int(0.12 * SR); kern = np.ones(k) / k
duck = np.convolve(duck, kern, mode='same')

mix = music * duck * 0.55 + S * 0.8 + np.stack([V, V]) * 0.95
# fades
fade = np.ones(N); fi = int(0.3 * SR); fade[:fi] = np.linspace(0, 1, fi); fo = int(1.8 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix *= fade
peak = np.abs(mix).max(); mix = mix / peak * 0.89
out = (mix.T * 32767).astype(np.int16)
w = wave.open('/tmp/claude-0/reveal/mix.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
# also stems for QA
for name, x in [('music', music * duck), ('voice', np.stack([V, V]))]:
    y = (x / (np.abs(x).max() + 1e-9) * 0.89).T
    w = wave.open(f'/tmp/claude-0/reveal/{name}.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
print('peak', peak, 'spans', [(round(a, 2), round(b, 2)) for a, b in spans])
