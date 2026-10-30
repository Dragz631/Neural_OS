import { CheckCircle2, GraduationCap } from 'lucide-react';
import { useEffect } from 'react';
import { Badge, Button, ErrorNote, Modal, Select } from '../../components/ui';
import { aulasDoDia, lerGrade, paraHora } from '../../domain/grade';
import { useMontarFaculdade } from './useMontarFaculdade';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORIGEM = { grade: 'na grade', disciplina: 'disciplina', estudo: 'estudo seu' };

/** O professor lê o Notion e o NotebookLM, propõe tudo numa tela e você aprova. */
export function MontarFaculdade({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMontarFaculdade();
  const { carregar } = m;

  useEffect(() => {
    if (open) void carregar();
  }, [open, carregar]);

  const grade = m.fac ? lerGrade(m.fac.gradeLinhas) : [];
  const marcadas = m.materias.filter((x) => x.marcada).length;

  return (
    <Modal open={open} onClose={m.fase === 'montando' ? () => undefined : onClose} title="Montar minha faculdade // o professor propõe, você aprova" wide>
      {m.fase === 'lendo' && <p className="py-8 text-center text-sm text-muted">Lendo o Notion e os cadernos do NotebookLM…</p>}

      {m.fase === 'erro' && <ErrorNote error={m.erro} />}

      {m.fase === 'escolher' && (
        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Sua semana (da grade do Notion)</h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].flatMap((d) =>
                aulasDoDia(grade, d).map((a) => (
                  <span key={`${d}-${a.inicio}`} className="rounded border border-line bg-bg px-2 py-1 text-xs">
                    <b className="text-accent">{DIAS[d]}</b> {paraHora(a.inicio)}–{paraHora(a.fim)} · {a.materia}
                  </span>
                )),
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Matérias</h3>
            <p className="text-xs text-muted">Marquei as que estão na sua grade. Marque outra só se ainda for estudar ela. Cada uma ganha um caminho feito pelo professor, a partir dos slides do caderno.</p>
            {m.semNotebook && <p className="text-xs text-warn">O NotebookLM não respondeu agora. Dá pra seguir sem slides, mas o caminho fica mais genérico: em Configurações › Fontes, aperte "Entrar no Google".</p>}
            <ul className="space-y-1.5">
              {m.materias.map((x) => (
                <li key={x.nome} className="flex flex-wrap items-center gap-2 rounded border border-line bg-bg px-2 py-1.5">
                  <input type="checkbox" checked={x.marcada} disabled={x.jaExiste} onChange={(e) => m.trocar(x.nome, { marcada: e.target.checked })} className="accent-accent" aria-label={`Criar ${x.nome}`} />
                  <span className="min-w-0 flex-1 truncate">{x.nome}</span>
                  {x.jaExiste ? <Badge>já existe</Badge> : <span className="text-[10px] text-muted">{ORIGEM[x.origem]}</span>}
                  {m.cadernos.length > 0 && !x.jaExiste && (
                    <Select value={x.cadernoId ?? ''} onChange={(e) => m.trocar(x.nome, { cadernoId: e.target.value || undefined })} className="w-auto max-w-56 py-0.5 text-xs" aria-label={`Caderno de ${x.nome}`}>
                      <option value="">sem caderno</option>
                      {m.cadernos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.titulo}
                        </option>
                      ))}
                    </Select>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={m.montar} disabled={marcadas === 0}>
              <GraduationCap size={14} /> Montar {marcadas} matéria(s)
            </Button>
            <span className="text-[11px] text-muted">Leva cerca de 1 minuto por matéria: o professor lê os slides de verdade.</span>
          </div>
        </div>
      )}

      {m.fase === 'montando' && (
        <div className="space-y-2 py-8 text-center">
          <p className="cursor-blink text-sm text-accent">{m.progresso}</p>
          <p className="text-xs text-muted">Pode deixar aberto. Não feche o app.</p>
        </div>
      )}

      {m.fase === 'datas' && (
        <div className="space-y-3 text-sm">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Datas que achei nos slides e nos seus lembretes</h3>
          {m.datas.length === 0 ? (
            <p className="text-xs text-muted">Não achei nenhuma data escrita. Quando o professor falar uma, é só pôr na sua aba de Trabalhos ou Provas no Notion.</p>
          ) : (
            <>
              <p className="text-xs text-muted">Só entra o que está escrito lá. Confira o trecho e desmarque o que não valer.</p>
              <ul className="space-y-1.5">
                {m.datas.map((d, i) => (
                  <li key={`${d.titulo}-${i}`} className="rounded border border-line bg-bg px-2 py-1.5">
                    <label className="flex flex-wrap items-center gap-2">
                      <input type="checkbox" checked={d.marcada} onChange={(e) => m.setDatas((l) => l.map((x, j) => (j === i ? { ...x, marcada: e.target.checked } : x)))} className="accent-accent" />
                      <b className="text-accent">{d.data.split('-').reverse().join('/')}</b>
                      <span className="min-w-0 flex-1 truncate">{d.titulo}</span>
                      <Badge>{d.tipo}</Badge>
                      <span className="text-[10px] text-muted">{d.materia}</span>
                    </label>
                    <p className="mt-1 truncate pl-6 text-[11px] text-muted">"{d.trecho}"</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button variant="primary" onClick={m.concluir}>
            Concluir
          </Button>
        </div>
      )}

      {m.fase === 'pronto' && (
        <div className="space-y-3 py-6 text-center">
          <p className="text-glow flex items-center justify-center gap-2 text-lg font-bold text-accent">
            <CheckCircle2 size={20} /> Sua faculdade está no Neural-OS
          </p>
          <p className="text-sm text-muted">Matérias com caminho, grade da semana e prazos prontos. Olhe o Próximo passo lá em cima.</p>
          <Button variant="primary" onClick={onClose}>
            Ver meu Lobby
          </Button>
        </div>
      )}
    </Modal>
  );
}
