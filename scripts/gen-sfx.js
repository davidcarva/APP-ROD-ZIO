// Gera toda a paleta sonora do app (WAV 16-bit mono 22050 Hz).
// Tudo sintetizado aqui — nenhum áudio de terceiros, sem direitos autorais.
// Uso: node gen-sfx.js <pasta-de-saida>
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT = process.argv[2];

// PRNG determinístico: os sons saem idênticos a cada geração
let seed = 1337;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function buffer(sec) {
  return new Float64Array(Math.floor(SR * sec));
}

function normalize(buf, peak) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max === 0) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

function writeWav(name, samples, peak) {
  normalize(samples, peak);
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([h, data]));
}

// soma `src` dentro de `dst` a partir de `at` segundos
function add(dst, src, at = 0, gain = 1) {
  const off = Math.floor(at * SR);
  for (let i = 0; i < src.length && i + off < dst.length; i++) dst[i + off] += src[i] * gain;
  return dst;
}

// nota com timbre de marimba + "pop" percussivo no ataque
function note(freq, sec, { tau = 0.11, harm = [[1, 1], [2, 0.32], [3, 0.1]], click = 0.18 } = {}) {
  const b = buffer(sec);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t / tau) * Math.min(1, t / 0.002);
    let s = 0;
    for (const [m, a] of harm) s += a * Math.sin(2 * Math.PI * freq * m * t);
    b[i] = s * env;
  }
  if (click > 0) add(b, noiseBurst(0.006, { tau: 0.0018, bright: true }), 0, click);
  return b;
}

// ruído branco com decaimento; `bright` realça agudos (diferença de 1ª ordem)
function noiseBurst(sec, { tau = 0.05, bright = false } = {}) {
  const b = buffer(sec);
  let prev = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const n = rand() * 2 - 1;
    const v = bright ? n - prev : n;
    prev = n;
    b[i] = v * Math.exp(-t / tau);
  }
  return b;
}

// senoide com glissando exponencial f0 -> f1 (acumulando fase, sem estalos)
function glide(f0, f1, sec, { tau = 0.2, attack = 0.004 } = {}) {
  const b = buffer(sec);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = f0 * Math.pow(f1 / f0, Math.min(1, t / sec));
    phase += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(phase) * Math.exp(-t / tau) * Math.min(1, t / attack);
  }
  return b;
}

const NOTES = {
  C4: 261.63, G4: 392.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, E6: 1318.5, G6: 1568.0, A6: 1760.0, C7: 2093.0, E7: 2637.0, G7: 3136.0,
};

// ——— TOQUES: 4 notas que sobem rumo ao marco de 5 (antecipação) + 1 extra ———
[NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5].forEach((f, i) => {
  writeWav(`tap${i + 1}.wav`, note(f, 0.35), 0.72);
});

// ——— MARCO ×5: arpejo brilhante ———
{
  const b = buffer(1.0);
  [NOTES.C6, NOTES.E6, NOTES.G6, NOTES.C7].forEach((f, i) =>
    add(b, note(f, 0.75, { tau: 0.28 + i * 0.03, click: 0.1 }), i * 0.075, 1 - i * 0.12)
  );
  writeWav('milestone.wav', b, 0.8);
}

// ——— LEVEL UP ×10: arpejo + acorde maior sustentado + purpurina ———
{
  const b = buffer(1.5);
  [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) =>
    add(b, note(f, 0.5, { tau: 0.2 }), i * 0.065)
  );
  [NOTES.C6, NOTES.E6, NOTES.G6].forEach((f) =>
    add(b, note(f, 1.2, { tau: 0.55, click: 0 }), 0.26, 0.7)
  );
  for (let k = 0; k < 7; k++) {
    const f = [NOTES.C7, NOTES.E7, NOTES.G7][k % 3];
    add(b, note(f, 0.25, { tau: 0.05, click: 0 }), 0.32 + k * 0.07, 0.25);
  }
  writeWav('levelup.wav', b, 0.85);
}

// ——— COMBO: faísca aguda rápida ———
{
  const b = buffer(0.35);
  [NOTES.C7, NOTES.E7, NOTES.G7].forEach((f, i) =>
    add(b, note(f, 0.2, { tau: 0.045, click: 0 }), i * 0.035)
  );
  writeWav('combo.wav', b, 0.45);
}

// ——— NOVO LÍDER: subida (glissando) + "ding" no topo ———
{
  const b = buffer(0.7);
  add(b, glide(420, 1320, 0.22, { tau: 0.5 }), 0, 0.6);
  add(b, note(NOTES.A6, 0.5, { tau: 0.18 }), 0.2, 0.9);
  add(b, note(NOTES.E7, 0.4, { tau: 0.14, click: 0 }), 0.26, 0.4);
  writeWav('lead.wav', b, 0.7);
}

// ——— UI: "bloop" de botão ———
{
  const b = glide(1000, 260, 0.12, { tau: 0.035, attack: 0.002 });
  writeWav('click.wav', b, 0.5);
}

// ——— UI: tique de seleção / contagem ———
{
  const b = buffer(0.06);
  add(b, glide(2600, 2200, 0.05, { tau: 0.012, attack: 0.001 }));
  add(b, noiseBurst(0.01, { tau: 0.002, bright: true }), 0, 0.35);
  writeWav('tick.wav', b, 0.35);
}

// ——— DESFAZER (−1): duas notas descendo ———
{
  const b = buffer(0.35);
  add(b, note(NOTES.G4, 0.25, { tau: 0.07 }), 0);
  add(b, note(NOTES.C4, 0.3, { tau: 0.09 }), 0.075);
  writeWav('undo.wav', b, 0.5);
}

// ——— RUFAR DE TAMBORES: batidas acelerando em crescendo ———
{
  const dur = 2.1;
  const b = buffer(dur);
  let t = 0;
  while (t < dur - 0.1) {
    const p = t / dur;
    const hit = noiseBurst(0.06, { tau: 0.022, bright: true });
    add(hit, glide(210, 170, 0.05, { tau: 0.02 }), 0, 0.3);
    add(b, hit, t, 0.18 + 0.82 * p * p);
    t += 0.085 - 0.058 * p; // intervalo encurta: 85ms -> 27ms
  }
  writeWav('drumroll.wav', b, 0.75);
}

// ——— REVELAÇÃO: prato + bumbo grave ———
{
  const b = buffer(1.7);
  add(b, noiseBurst(1.7, { tau: 0.5, bright: true }), 0, 0.55);
  add(b, glide(120, 45, 0.35, { tau: 0.18, attack: 0.001 }), 0, 1.0);
  writeWav('reveal.wav', b, 0.9);
}

// ——— WHOOSH: ruído com filtro varrendo (cartão deslizando) ———
{
  const dur = 0.42;
  const b = buffer(dur);
  let lp = 0;
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length;
    const cutoff = 0.02 + 0.35 * Math.sin(Math.PI * p); // abre e fecha
    lp += cutoff * (rand() * 2 - 1 - lp);
    b[i] = lp * Math.sin(Math.PI * p); // envelope em arco
  }
  writeWav('whoosh.wav', b, 0.5);
}

// ——— FANFARRA DO CAMPEÃO ———
{
  const b = buffer(1.7);
  [NOTES.C5, NOTES.E5, NOTES.G5].forEach((f, i) => add(b, note(f, 0.5, { tau: 0.2 }), i * 0.12));
  add(b, note(NOTES.C6, 1.3, { tau: 0.5 }), 0.36, 1.1);
  add(b, note(NOTES.E6, 1.2, { tau: 0.45, click: 0 }), 0.36, 0.55);
  add(b, note(NOTES.G6, 1.2, { tau: 0.45, click: 0 }), 0.36, 0.45);
  writeWav('fanfare.wav', b, 0.85);
}

console.log('paleta sonora gerada em', OUT);
