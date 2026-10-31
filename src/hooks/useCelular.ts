import { useEffect, useState } from 'react';

/** Tela de celular (menos de 768 px de largura). Acompanha girar o aparelho e redimensionar a janela. */
export function useCelular(): boolean {
  const consulta = '(max-width: 767px)';
  const [celular, setCelular] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(consulta).matches));
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const on = () => setCelular(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, []);
  return celular;
}
