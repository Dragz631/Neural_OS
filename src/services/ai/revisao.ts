import type { PerguntaRevisao, Diagnostico, Nivel, TipoErro } from '../../domain/revisao';
import { aprendizParaIA } from '../../store/aprendiz';
import { asString, asStrings, chatJSON } from './client';
import { PROFESSOR } from './persona';

// Revisão guiada. O professor pergunta, escuta o raciocínio e descobre ONDE ele
// quebrou (não só se está certo). O conserto ataca aquele erro e termina numa ação.

const sys = (extra: string) => ({ role: 'system' as const, content: `${PROFESSOR}\n${aprendizParaIA()}\n${extra}` });

export interface PedidoPerguntas {
  topico: string;
  materia: string;
  /** Slides/aula ou anotações. É daqui que as perguntas saem. */
  material: string;
  quantas: number;
  cansado: boolean;
  /** "Slide 12" onde a aula de hoje começou (se a pessoa disse). */
  aPartirDe?: string;
}

export async function gerarPerguntas(p: PedidoPerguntas, signal?: AbortSignal): Promise<PerguntaRevisao[]> {
  return chatJSON(
    [
      sys('Você conduz uma revisão guiada: a pessoa precisa LEMBRAR e explicar, não reconhecer opção.'),
      {
        role: 'user',
        content: `Matéria: ${p.materia}. Tópico: ${p.topico}.
${p.aPartirDe ? `A aula de hoje começou em: ${p.aPartirDe}. Pergunte só do que veio a partir dali.\n` : ''}Material (use SÓ isto, não invente):
"""
${p.material.slice(0, 6000)}
"""
Crie ${p.quantas} perguntas, da mais simples à mais difícil, cada uma sobre uma ideia diferente.
${p.cansado ? 'A pessoa está CANSADA: perguntas curtas, leves, quase um joguinho ("o que acontece se…?", "qual a diferença entre A e B?"), sem exigir texto longo.' : 'Misture: explicar com as próprias palavras, prever o que acontece, comparar duas ideias.'}
Em "origem" diga de onde saiu (ex.: "Slide 12" ou o nome do arquivo) quando o material trouxer isso, senão deixe "".
Formato JSON: {"perguntas": [{"pergunta": "...", "referencia": "resposta certa em 1-2 frases", "origem": "..."}]}`,
      },
    ],
    (raw) => {
      const lista = (raw as { perguntas?: unknown }).perguntas;
      if (!Array.isArray(lista) || lista.length === 0) throw new Error('sem perguntas');
      return lista.slice(0, p.quantas).map((x, i) => {
        const o = x as Record<string, unknown>;
        return { id: `ia-${i}`, pergunta: asString(o.pergunta, 'pergunta'), referencia: asString(o.referencia, 'referencia'), origem: typeof o.origem === 'string' && o.origem ? o.origem : undefined, leve: p.cansado };
      });
    },
    signal,
  );
}

const NIVEIS: Nivel[] = ['certo', 'quase', 'errado'];
const TIPOS: TipoErro[] = ['lacuna', 'confusao', 'superficial', 'procedimento', 'nenhum'];

export async function diagnosticar(pergunta: PerguntaRevisao, resposta: string, material: string, cansado: boolean, signal?: AbortSignal): Promise<Diagnostico> {
  return chatJSON(
    [
      sys('Você ouve o raciocínio do aluno e descobre exatamente ONDE ele quebrou, pra consertar só aquilo.'),
      {
        role: 'user',
        content: `Pergunta: ${pergunta.pergunta}
Resposta certa (referência): ${pergunta.referencia || '(use o material)'}
Material da aula:
"""
${material.slice(0, 3000)}
"""
Resposta do aluno${cansado ? ' (ele está cansado: seja gentil e curto)' : ''}:
"""
${resposta || '(não soube responder)'}
"""
Faça o diagnóstico:
- "nivel": certo | quase | errado.
- "acertou": o que ele acertou (sempre ache algo, mesmo pequeno), em frases curtas.
- "ajusteFino": o refinamento, em 1 frase (vazio se estava perfeito).
- "tipoErro": nenhum | lacuna (não conhecia a ideia) | confusao (misturou com outro conceito) | superficial (sabe o nome, falta o porquê) | procedimento (ideia ok, passos fora de ordem).
- "causa": em UMA frase, onde o raciocínio quebrou.
- "reparo": o conserto SÓ daquele erro, não a aula toda. "ideia": até 2 frases simples. "imagem": 1 frase começando com "Pense assim:" que ele consiga ver.
Formato JSON: {"nivel":"","acertou":[""],"ajusteFino":"","tipoErro":"","causa":"","reparo":{"ideia":"","imagem":""}}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      const r = (o.reparo ?? {}) as Record<string, unknown>;
      const nivel = NIVEIS.includes(o.nivel as Nivel) ? (o.nivel as Nivel) : 'quase';
      const tipoErro = TIPOS.includes(o.tipoErro as TipoErro) ? (o.tipoErro as TipoErro) : nivel === 'certo' ? 'nenhum' : 'lacuna';
      return {
        nivel,
        acertou: asStrings(o.acertou),
        ajusteFino: typeof o.ajusteFino === 'string' ? o.ajusteFino : '',
        tipoErro,
        causa: typeof o.causa === 'string' ? o.causa : '',
        reparo: { ideia: asString(r.ideia ?? '', 'reparo.ideia'), imagem: typeof r.imagem === 'string' ? r.imagem : '' },
      };
    },
    signal,
  );
}
