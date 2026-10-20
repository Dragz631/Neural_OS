// Mapa de uma matéria: a lista de tópicos em ordem de aprendizado, cada um
// dizendo POR QUE existe e de qual tópico anterior depende.
// É o que transforma "quero aprender SQL" num caminho pronto (galho na Árvore).

export interface TopicoDoMapa {
  titulo: string;
  porque: string;
  /** Índice (neste mesmo mapa) do tópico que é pré-requisito. Ausente = começa direto da matéria. */
  pai?: number;
  /** Minutos sugeridos pra primeira aula. */
  minutos?: number;
}

export interface MapaMateria {
  materia: string;
  /** Linguagem dos desafios no Sandbox ('' = matéria sem código). */
  linguagem: string;
  objetivo?: string;
  topicos: TopicoDoMapa[];
}

export type OrigemMapa = 'ia' | 'pronto' | 'importado' | 'manual';

/** Confere e conserta o que vier (da IA ou de arquivo). Lança erro se não der pra usar. */
export function validarMapa(bruto: unknown): MapaMateria {
  const o = bruto as Partial<MapaMateria>;
  if (!o || typeof o.materia !== 'string' || !Array.isArray(o.topicos)) throw new Error('mapa sem matéria ou tópicos');
  const topicos = o.topicos
    .filter((t): t is TopicoDoMapa => !!t && typeof t.titulo === 'string' && t.titulo.trim() !== '')
    .slice(0, 25)
    .map((t, i) => ({
      titulo: t.titulo.trim(),
      porque: typeof t.porque === 'string' ? t.porque.trim() : '',
      // Pai só vale se apontar pra um tópico ANTERIOR (evita ciclo).
      pai: Number.isInteger(t.pai) && (t.pai as number) >= 0 && (t.pai as number) < i ? t.pai : undefined,
      minutos: Number.isFinite(t.minutos) ? Math.min(90, Math.max(5, Math.round(t.minutos as number))) : undefined,
    }));
  if (topicos.length < 2) throw new Error('mapa com tópicos de menos');
  return {
    materia: o.materia.trim(),
    linguagem: typeof o.linguagem === 'string' ? o.linguagem : '',
    objetivo: typeof o.objetivo === 'string' ? o.objetivo : undefined,
    topicos,
  };
}

/** Remove um tópico e conserta os pais (filhos herdam o avô; índices são reajustados). */
export function removerTopico(mapa: MapaMateria, indice: number): MapaMateria {
  const removido = mapa.topicos[indice];
  const topicos = mapa.topicos
    .filter((_, i) => i !== indice)
    .map((t) => {
      let pai = t.pai === indice ? removido.pai : t.pai;
      if (pai !== undefined && pai > indice) pai -= 1;
      return { ...t, pai };
    });
  return { ...mapa, topicos };
}
