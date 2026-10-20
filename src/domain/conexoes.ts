// A mente do Prof. A.Ilson é uma só; os MOTORES são só quem faz a conta.
// Dividir em motores serve pra gastar menos: tarefa leve no modelo local,
// aula no modelo bom, e o difícil (quadro desenhado, dossiê com pesquisa)
// no Claude pela assinatura do Hugo. Usado pelo app e pelo servidor (server/conexoes).

export type Motor = 'leve' | 'professor' | 'dificil';

/** openai = qualquer API no formato OpenAI; claude-cli = Claude Code instalado no PC (assinatura). */
export type TipoConexao = 'openai' | 'claude-cli';

export interface Conexao {
  id: string;
  nome: string;
  tipo: TipoConexao;
  /** Termina em /v1 (ou equivalente): o servidor chama `${baseUrl}/chat/completions`. */
  baseUrl: string;
  modelo: string;
  /** Teto de chamadas por dia (0/ausente = sem teto). Protege cota dividida, ex.: NVIDIA do Brazuka. */
  limiteDia?: number;
}

export interface ConfigConexoes {
  conexoes: Conexao[];
  motores: Partial<Record<Motor, string>>;
}

/** O que o navegador recebe: nunca a chave, só se ela existe. */
export interface ConexaoPublica extends Conexao {
  temChave: boolean;
  usoHoje: number;
}

export const MOTORES: Record<Motor, { nome: string; explica: string }> = {
  leve: { nome: 'Leve', explica: 'Cartões do feed, nota do "explique em 1 frase", ligação do dia. Modelo local/barato.' },
  professor: { nome: 'Professor', explica: 'Aula, dúvidas, mapa da matéria, desafios, correção e dicas. Modelo bom.' },
  dificil: { nome: 'Difícil', explica: 'Quadro desenhado, dossiê da matéria e quando o professor erra 2 vezes. Claude pela assinatura.' },
};

/** Se o motor pedido falhar (fora do ar, cota, erro), quem assume, em ordem. */
export const CADEIA: Record<Motor, Motor[]> = {
  leve: ['leve', 'professor', 'dificil'],
  professor: ['professor', 'dificil', 'leve'],
  dificil: ['dificil', 'professor'],
};

export interface Preset {
  id: string;
  nome: string;
  tipo: TipoConexao;
  baseUrl: string;
  modelo: string;
  precisaChave: boolean;
  dica: string;
  limiteDia?: number;
}

export const PRESETS: Preset[] = [
  { id: 'claude', nome: 'Claude (sua assinatura)', tipo: 'claude-cli', baseUrl: 'claude-code', modelo: 'sonnet', precisaChave: false, dica: 'Usa o Claude Code instalado no PC, com o seu login. Gasta o mesmo limite que você usa no Claude. Modelos: haiku, sonnet, opus.' },
  { id: 'nvidia', nome: 'NVIDIA NIM', tipo: 'openai', baseUrl: 'https://integrate.api.nvidia.com/v1', modelo: 'nvidia/nemotron-3-super-120b-a12b', precisaChave: true, dica: 'Chave nvapi-… em build.nvidia.com. Dá pra usar a do Brazuka (cota dividida: deixe um teto por dia).', limiteDia: 150 },
  { id: 'ollama', nome: 'Ollama (local)', tipo: 'openai', baseUrl: 'http://localhost:11434/v1', modelo: '', precisaChave: false, dica: 'Modelo rodando no seu PC. O Ollama precisa estar aberto.' },
  { id: 'openrouter', nome: 'OpenRouter', tipo: 'openai', baseUrl: 'https://openrouter.ai/api/v1', modelo: '', precisaChave: true, dica: 'Uma chave pra centenas de modelos (vários grátis). openrouter.ai/keys.' },
  { id: 'anthropic', nome: 'Anthropic (API)', tipo: 'openai', baseUrl: 'https://api.anthropic.com/v1', modelo: 'claude-sonnet-5-5', precisaChave: true, dica: 'Chave paga por uso (console.anthropic.com), separada da assinatura.' },
  { id: 'openai', nome: 'OpenAI', tipo: 'openai', baseUrl: 'https://api.openai.com/v1', modelo: '', precisaChave: true, dica: 'Chave em platform.openai.com.' },
  { id: 'gemini', nome: 'Google Gemini', tipo: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelo: '', precisaChave: true, dica: 'Chave em aistudio.google.com (tem cota grátis).' },
  { id: 'groq', nome: 'Groq', tipo: 'openai', baseUrl: 'https://api.groq.com/openai/v1', modelo: '', precisaChave: true, dica: 'Muito rápido, tem cota grátis. console.groq.com.' },
  { id: 'lmstudio', nome: 'LM Studio (local)', tipo: 'openai', baseUrl: 'http://localhost:1234/v1', modelo: '', precisaChave: false, dica: 'Servidor local do LM Studio ligado.' },
  { id: 'hermes', nome: 'Hermes Agent', tipo: 'openai', baseUrl: 'http://localhost:8642/v1', modelo: 'hermes-agent', precisaChave: false, dica: 'Hermes com o API server ligado (porta 8642).' },
  { id: 'outro', nome: 'Outro (qualquer API formato OpenAI)', tipo: 'openai', baseUrl: '', modelo: '', precisaChave: false, dica: 'Endereço que termina em /v1 (ou o que o provedor indicar).' },
];
