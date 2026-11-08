import { useFeed } from '../store/feed';

// Bipes 8-bit gerados na hora (onda quadrada, WebAudio). Nada de arquivo.
// Respeita o botão de som do feed. O navegador só libera áudio depois de um
// clique, e todo som aqui nasce de um clique, então tudo bem.

let ctx: AudioContext | null = null;

function tocar(notas: [freq: number, ms: number][], volume = 0.05) {
  if (!useFeed.getState().som) return;
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, ms] of notas) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch {
    // Sem áudio (navegador bloqueou ou não tem): segue em silêncio.
  }
}

export const sons = {
  acerto: () => tocar([[660, 70], [990, 110]]),
  erro: () => tocar([[220, 140], [165, 200]], 0.04),
  combo: (n: number) => tocar([[523, 60], [659, 60], [784, 60], [1047 + n * 40, 140]]),
  fim: () => tocar([[523, 90], [659, 90], [784, 90], [1047, 260]]),
  /** Estudo guiado: acabou o foco, hora de descansar (desce, calmo). */
  pausa: () => tocar([[784, 160], [659, 160], [523, 320]], 0.04),
  /** Estudo guiado: acabou a pausa, hora de voltar (sobe). */
  voltar: () => tocar([[523, 120], [659, 120], [784, 220]], 0.04),
};
