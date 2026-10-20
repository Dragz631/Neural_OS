import { acharMapaPronto } from '../data/mapas';
import { validarMapa, type MapaMateria, type OrigemMapa } from '../domain/mapa';

// De onde pode vir o mapa de uma matéria, sem IA.
// (A IA fica no modal, porque precisa de sinal de cancelamento e mostra "carregando".)

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Mapas que o Claude gerou por arquivo (Estudos-vault/Neural-OS/import/mapas). */
export async function acharMapaImportado(nome: string): Promise<MapaMateria | undefined> {
  try {
    const lista: { arquivo: string; mapa: unknown }[] = await fetch('/api/estudos/mapas').then((r) => r.json());
    const alvo = normalizar(nome);
    for (const { arquivo, mapa } of lista) {
      const m = mapa as { materia?: string };
      if (normalizar(m.materia ?? '') === alvo || normalizar(arquivo.replace(/\.json$/, '')) === alvo) return validarMapa(mapa);
    }
  } catch {
    /* sem servidor/cofre: segue sem */
  }
  return undefined;
}

export async function mapaSemIA(nome: string): Promise<{ mapa: MapaMateria; origem: OrigemMapa } | undefined> {
  const importado = await acharMapaImportado(nome);
  if (importado) return { mapa: importado, origem: 'importado' };
  const pronto = acharMapaPronto(nome);
  if (pronto) return { mapa: pronto, origem: 'pronto' };
  return undefined;
}

/** Ponto de partida pra criar na mão: 3 tópicos genéricos pra editar. */
export const mapaManual = (nome: string): MapaMateria => ({
  materia: nome,
  linguagem: '',
  topicos: [
    { titulo: `Visão geral de ${nome}`, porque: 'O mapa geral antes dos detalhes.', minutos: 25 },
    { titulo: 'Primeiro conceito', porque: '', pai: 0, minutos: 30 },
    { titulo: 'Segundo conceito', porque: '', pai: 1, minutos: 30 },
  ],
});
