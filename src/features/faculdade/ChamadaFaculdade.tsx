import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Button, Panel } from '../../components/ui';
import { useConexoes } from '../../store/conexoes';
import { useFaculdade } from '../../store/faculdade';
import { MontarFaculdade } from './MontarFaculdade';

/** No Lobby: Notion ligado e faculdade ainda não montada → um botão só. */
export function ChamadaFaculdade() {
  const temNotion = useConexoes((s) => s.temNotion);
  const montada = useFaculdade((s) => !!s.montadaEm);
  const [aberto, setAberto] = useState(false);

  if (!temNotion || (montada && !aberto)) return null;
  return (
    <>
      <Panel accent>
        <div className="flex flex-wrap items-center gap-3">
          <GraduationCap size={22} className="text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-fg">Seu Notion está ligado. Vamos trazer a sua faculdade pra cá?</p>
            <p className="text-xs text-muted">O professor lê a grade e os slides, monta o caminho de cada matéria e acha as datas. Você aprova antes de entrar.</p>
          </div>
          <Button variant="primary" onClick={() => setAberto(true)}>
            Montar minha faculdade
          </Button>
        </div>
      </Panel>
      <MontarFaculdade open={aberto} onClose={() => setAberto(false)} />
    </>
  );
}
