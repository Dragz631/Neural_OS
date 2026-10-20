import { NextStepBar } from '../../components/NextStepBar';
import { AbasLobby } from './AbasLobby';
import { CaixaEntradaCard } from './CaixaEntradaCard';
import { CalendarioCard } from './CalendarioCard';
import { EntregasCard } from './EntregasCard';
import { FaixaMaterias } from './FaixaMaterias';
import { MissoesHoje } from './MissoesHoje';
import { PerfilResumo } from './PerfilResumo';
import { TargetTerminal } from './TargetTerminal';
import { useTrofeus } from './useTrofeus';

// Lobby "cockpit": em cima, UMA ação (Próximo passo). No meio, o que fazer hoje.
// Embaixo, o que é bom ter à mão. Cada bloco é um arquivo em features/lobby/.

export default function Lobby() {
  useTrofeus(); // destrava e paga troféus mesmo com a aba de troféus fechada

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <NextStepBar variant="hero" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <MissoesHoje />
        <TargetTerminal />
      </div>

      <FaixaMaterias />

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
