import { useDungeon } from '../features/dungeon/store';
import { useCaixa } from './caixaEntrada';
import { useAprendiz } from './aprendiz';
import { useTema } from './tema';
import { useEntregas } from './entregas';
import { useFaculdade } from './faculdade';
import { useImportacao } from './importacao';
import { usePresenca } from './presenca';
import { exportData, useStudy, type StudyData } from './study';
import { useTrofeusPagos } from './trofeus';

// Backup completo: junta todos os stores num JSON só.
// Lousas não entram (ficam no IndexedDB e já têm cópia .excalidraw no cofre de estudos).

export interface BackupV3 {
  formato: 'neural-os-v3';
  estudo: StudyData;
  entregas: ReturnType<typeof useEntregas.getState>['lista'];
  caixa: ReturnType<typeof useCaixa.getState>['notas'];
  presenca: string[];
  faculdade?: Pick<ReturnType<typeof useFaculdade.getState>, 'montadaEm' | 'blocos' | 'eventos' | 'cadernoDe'>;
  contextoMaterias?: Record<string, string>;
  aprendiz?: Pick<ReturnType<typeof useAprendiz.getState>, 'respostas' | 'perfil' | 'livre'>;
  tema?: { baseId: string; valores: unknown };
  trofeusPagos: string[];
  dungeon: Pick<ReturnType<typeof useDungeon.getState>, 'track' | 'progress'>;
}

export function gerarBackup(): BackupV3 {
  const { track, progress } = useDungeon.getState();
  return {
    formato: 'neural-os-v3',
    estudo: exportData(),
    entregas: useEntregas.getState().lista,
    caixa: useCaixa.getState().notas,
    presenca: usePresenca.getState().dias,
    faculdade: (({ montadaEm, blocos, eventos, cadernoDe }) => ({ montadaEm, blocos, eventos, cadernoDe }))(useFaculdade.getState()),
    contextoMaterias: useImportacao.getState().contexto,
    aprendiz: (({ respostas, perfil, livre }) => ({ respostas, perfil, livre }))(useAprendiz.getState()),
    tema: (({ baseId, valores }) => ({ baseId, valores }))(useTema.getState()),
    trofeusPagos: useTrofeusPagos.getState().pagos,
    dungeon: { track, progress },
  };
}

/** Aceita o backup novo e também o da v2 (que era só o StudyData). */
export function restaurarBackup(dados: unknown) {
  const d = dados as Partial<BackupV3> & Partial<StudyData>;
  if (d.formato === 'neural-os-v3' && d.estudo) {
    useStudy.getState().replaceAll(d.estudo);
    useEntregas.setState({ lista: d.entregas ?? [] });
    useCaixa.setState({ notas: d.caixa ?? [] });
    usePresenca.setState({ dias: d.presenca ?? [] });
    if (d.faculdade) useFaculdade.setState(d.faculdade);
    if (d.contextoMaterias) useImportacao.setState({ contexto: d.contextoMaterias });
    if (d.aprendiz) useAprendiz.getState().carregar(d.aprendiz);
    if (d.tema) useTema.getState().carregar(d.tema);
    useTrofeusPagos.setState({ pagos: d.trofeusPagos ?? [] });
    if (d.dungeon) useDungeon.setState(d.dungeon);
    return;
  }
  if (Array.isArray(d.subjects) && Array.isArray(d.topics)) {
    useStudy.getState().replaceAll(d as StudyData);
    return;
  }
  throw new Error('arquivo não parece um backup do Neural-OS');
}
