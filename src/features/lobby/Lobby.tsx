import { NextStepBar } from '../../components/NextStepBar';
import { NovidadesNotebook } from '../../components/NovidadesNotebook';
import { ChamadaFaculdade } from '../faculdade/ChamadaFaculdade';
import { GradeLobby } from './GradeLobby';
import { PrimeirasImpressoes } from './PrimeirasImpressoes';
import { useTrofeus } from './useTrofeus';

// Lobby "cockpit": em cima, UMA ação (Próximo passo). Embaixo, os widgets numa grade que a
// pessoa arruma como a tela inicial do celular (GradeLobby). Catálogo em widgets.tsx.

export default function Lobby() {
  useTrofeus(); // destrava e paga troféus mesmo com a aba de troféus fechada

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <PrimeirasImpressoes />
      <NextStepBar variant="hero" />
      <ChamadaFaculdade />
      <NovidadesNotebook />
      <GradeLobby />
    </div>
  );
}
