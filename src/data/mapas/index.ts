import { validarMapa, type MapaMateria } from '../../domain/mapa';
import bancoDeDados from './banco-de-dados.json';
import basesC from './bases-programacao-c.json';
import calculo from './calculo.json';
import csharp from './csharp-poo.json';
import cyber from './cybersecurity.json';
import lfa from './lfa.json';
import python from './python.json';
import sistemas from './sistemas-computacionais.json';
import sql from './sql.json';
import uxui from './ux-ui.json';
import web from './web.json';

// Mapas prontos (funcionam sem IA). Cada um tem apelidos pra achar pelo que você digitar.

const PRONTOS: { mapa: unknown; apelidos: string[] }[] = [
  { mapa: sql, apelidos: ['sql', 'consultas'] },
  { mapa: cyber, apelidos: ['cyber', 'cybersecurity', 'ciberseguranca', 'seguranca', 'hacking', 'pentest'] },
  { mapa: python, apelidos: ['python', 'py'] },
  { mapa: csharp, apelidos: ['c#', 'csharp', 'poo', 'orientacao a objetos', '.net', 'dotnet'] },
  { mapa: basesC, apelidos: ['bases da programacao', 'bases', 'linguagem c', 'c', 'logica de programacao', 'algoritmos'] },
  { mapa: lfa, apelidos: ['lfa', 'linguagens formais', 'automatos', 'teoria da computacao'] },
  { mapa: calculo, apelidos: ['calculo', 'calculo 1', 'calculo i', 'calculo 2', 'calculo ii'] },
  { mapa: web, apelidos: ['web', 'html', 'css', 'javascript', 'js', 'front-end', 'frontend'] },
  { mapa: sistemas, apelidos: ['sistemas computacionais', 'arquitetura de computadores', 'organizacao de computadores', 'sistemas operacionais'] },
  { mapa: bancoDeDados, apelidos: ['banco de dados', 'bd', 'bancos de dados', 'modelagem de dados'] },
  { mapa: uxui, apelidos: ['ux', 'ui', 'ux/ui', 'ux ui', 'design de interface', 'ux/ui design'] },
];

/** Tira acento, caixa e espaços extras pra comparar "Cálculo II" com "calculo ii". */
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Procura um mapa pronto pelo nome digitado (exato primeiro, depois "contém"). */
export function acharMapaPronto(nome: string): MapaMateria | undefined {
  const alvo = normalizar(nome);
  if (!alvo) return undefined;
  const exato = PRONTOS.find((p) => p.apelidos.includes(alvo));
  const parecido = exato ?? PRONTOS.find((p) => p.apelidos.some((a) => a.length > 2 && (alvo.includes(a) || a.includes(alvo))));
  return parecido ? validarMapa(parecido.mapa) : undefined;
}

export const nomesProntos = () => PRONTOS.map((p) => (p.mapa as { materia: string }).materia);
