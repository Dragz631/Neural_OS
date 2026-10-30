import { useCallback, useEffect, useRef, useState } from 'react';

// Falar em vez de digitar (reconhecimento de voz do navegador, em português).
// Quando o navegador não tem, `disponivel` é false e a tela só mostra o campo de texto.

interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type Construtor = new () => Reconhecedor;

const construtor = (): Construtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export function useVoz(aoOuvir: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const callback = useRef(aoOuvir);
  callback.current = aoOuvir;
  const disponivel = typeof window !== 'undefined' && !!construtor();

  useEffect(() => () => rec.current?.stop(), []);

  const alternar = useCallback(() => {
    if (ouvindo) {
      rec.current?.stop();
      return;
    }
    const C = construtor();
    if (!C) return;
    setErro(null);
    const r = new C();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const texto = Array.from(e.results)
        .filter((x) => x.isFinal)
        .map((x) => x[0].transcript)
        .join(' ')
        .trim();
      if (texto) callback.current(texto);
    };
    r.onerror = (e) => setErro(e.error === 'not-allowed' ? 'O navegador não deixou usar o microfone.' : `Microfone: ${e.error}`);
    r.onend = () => setOuvindo(false);
    rec.current = r;
    r.start();
    setOuvindo(true);
  }, [ouvindo]);

  return { disponivel, ouvindo, alternar, erro };
}
