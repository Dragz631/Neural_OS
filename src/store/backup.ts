import { useDungeon } from '../features/dungeon/store';
import { useCaixa } from './caixaEntrada';
import { useEntregas } from './entregas';
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
