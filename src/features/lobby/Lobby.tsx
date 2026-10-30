import { NextStepBar } from '../../components/NextStepBar';
import { ChamadaFaculdade } from '../faculdade/ChamadaFaculdade';
import { AbasLobby } from './AbasLobby';
import { CaixaEntradaCard } from './CaixaEntradaCard';
import { CalendarioCard } from './CalendarioCard';
import { EntregasCard } from './EntregasCard';
import { FaixaMaterias } from './FaixaMaterias';
import { FeedCartoes } from './feed/FeedCartoes';
import { LembreteWidget } from './LembreteWidget';
import { LigacaoDoDia } from './LigacaoDoDia';
import { MissoesHoje } from './MissoesHoje';
import { PerfilResumo } from './PerfilResumo';
import { TargetTerminal } from './TargetTerminal';
import { useTrofeus } from './useTrofeus';

// Lobby "cockpit": em cima, UMA ação (Próximo passo). No meio, o feed de cartões
// (rodadas de 5 que devolvem pro Próximo passo) e, ao lado, Target e missões.
// Embaixo, o que é bom ter à mão. Cada bloco é um arquivo em features/lobby/.

export default function Lobby() {
  useTrofeus(); // destrava e paga troféus mesmo com a aba de troféus fechada

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <NextStepBar variant="hero" />
      <ChamadaFaculdade />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <FeedCartoes />
        <div className="space-y-4">
          <TargetTerminal />
          <MissoesHoje />
          <LembreteWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <FaixaMaterias />
        <LigacaoDoDia />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PerfilResumo />
        <EntregasCard />
        <CalendarioCard />
        <CaixaEntradaCard />
      </div>

      <AbasLobby />
    </div>
  );
}
