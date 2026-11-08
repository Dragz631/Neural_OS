import { useState } from 'react';
import { Play } from 'lucide-react';
import { CONTAS_POR_PARTIDA, dificeis, SEGUNDOS_POR_PARTIDA, XP_MAX_DIA } from '../../domain/tabuada';
import { toLocalDate } from '../../domain/dates';
import { MapaTabuada, PartidaTabuada } from '../../components/Tabuada';
import { Button, Modal, Panel } from '../../components/ui';
import { useTabuada } from '../../store/tabuada';

/** Widget do Lobby: o mapa 10×10 da tabuada e uma partida de 60 s (sem IA, funciona offline). */
export function TabuadaWidget() {
  const [jogo, setJogo] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [acabou, setAcabou] = useState(false);
  const divisao = useTabuada((s) => s.divisao);
  const fatos = useTabuada((s) => s.fatos);
  const xpHoje = useTabuada((s) => (s.xpDia.data === toLocalDate() ? s.xpDia.xp : 0));
  const dif = dificeis(fatos);
  const jogar = () => {
    setJogo((j) => j + 1);
    setAcabou(false);
    setAberto(true);
  };

  return (
    <Panel title="Tabuada // base de tudo">
      <div className="space-y-2">
        <MapaTabuada />
        {dif.length > 0 && <p className="text-[11px] text-muted">Difíceis: <b className="font-mono text-warn">{dif.join(', ')}</b></p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={jogar}>
            <Play size={13} /> Jogar {SEGUNDOS_POR_PARTIDA} s
          </Button>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            <input type="checkbox" checked={divisao} onChange={() => useTabuada.getState().alternarDivisao()} /> com divisão
          </label>
          <span className="ml-auto text-[10px] text-muted" title={`1 XP por acerto em menos de 5 s, até ${XP_MAX_DIA} por dia`}>
            {xpHoje}/{XP_MAX_DIA} XP hoje
          </span>
        </div>
      </div>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Tabuada">
        <PartidaTabuada key={jogo} quantas={CONTAS_POR_PARTIDA} segundos={SEGUNDOS_POR_PARTIDA} onFim={() => setAcabou(true)} />
        {acabou && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="primary" onClick={jogar}>
              <Play size={13} /> De novo
            </Button>
            <Button onClick={() => setAberto(false)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
