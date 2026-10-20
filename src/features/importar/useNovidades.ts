import { useCallback, useEffect, useMemo, useState } from 'react';
import { lerImportacao, novidades, type Importacao } from '../../domain/importacao';
import { useEntregas } from '../../store/entregas';
import { useImportacao } from '../../store/importacao';
import { useStudy } from '../../store/study';

const VAZIA: Importacao = { disciplinas: [], entregas: [], cadernos: [] };

/** Lê notion.json + notebooklm.json (via servidor de dev) e diz o que é novo. */
export function useNovidades() {
  const [imp, setImp] = useState<Importacao>(VAZIA);
  const subjects = useStudy((s) => s.subjects);
  const entregas = useEntregas((s) => s.lista);
  const vistos = useImportacao((s) => s.vistos);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch('/api/estudos/import');
      if (!r.ok) return;
      const { notion, notebooklm } = await r.json();
      setImp(lerImportacao(notion, notebooklm));
    } catch {
      // Sem servidor de dev (build estático): sem importação, sem erro na cara.
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const novas = useMemo(() => novidades(imp, subjects, entregas, new Set(vistos)), [imp, subjects, entregas, vistos]);
  const total = novas.disciplinas.length + novas.entregas.length + novas.cadernos.length;
  return { imp, novas, total, recarregar };
}
