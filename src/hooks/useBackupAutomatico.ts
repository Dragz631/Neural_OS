import { useEffect } from 'react';
import { toLocalDate } from '../domain/dates';
import { gerarBackup } from '../store/backup';
import { useStudy } from '../store/study';

// Backup automático no cofre de estudos: uma cópia por dia em
// Estudos-vault/Neural-OS/backup/neural-os-AAAA-MM-DD.json (a do dia é
// atualizada; as dos dias anteriores ficam). Os dados do app vivem só no
// navegador: se ele perder tudo, restaura em Configurações → Restaurar.
// Nunca grava um estado vazio por cima de um backup bom.

const A_CADA_MS = 5 * 60 * 1000;
let ultimo = '';

function corpo(): string | null {
  const { subjects, topics } = useStudy.getState();
  if (subjects.length === 0 && topics.length === 0) return null; // vazio: não sobrescreve nada
  const conteudo = JSON.stringify(gerarBackup(), null, 2);
  if (conteudo === ultimo) return null;
  ultimo = conteudo;
  return JSON.stringify({ path: `Neural-OS/backup/neural-os-${toLocalDate()}.json`, content: conteudo });
}

export function useBackupAutomatico() {
  useEffect(() => {
    const salvar = () => {
      const c = corpo();
      if (c) void fetch('/api/estudos/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: c }).catch(() => (ultimo = ''));
    };
    const naSaida = () => {
      const c = corpo();
      if (c) navigator.sendBeacon('/api/estudos/file', new Blob([c], { type: 'application/json' }));
    };
    salvar();
    const t = setInterval(salvar, A_CADA_MS);
    window.addEventListener('pagehide', naSaida);
    return () => {
      clearInterval(t);
      window.removeEventListener('pagehide', naSaida);
    };
  }, []);
}
