// ─── Ollama & Heuristic Local AI Service ──────────────────────────────────────

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface FeynmanEvaluation {
  score: number; // 0-100
  passed: boolean;
  feedback: string;
  formalCorrection: string;
}

export interface ClassroomLectureData {
  topic: string;
  whyItExists: string;
  whereToLook: string;
  blackboardAdvice: string;
  realWorldScenario: string;
}

export interface ExamQuestion {
  tag: string;
  prompt: string;
  options: { label: string; correct?: boolean }[];
  explanation?: string;
}

class OllamaService {
  private defaultEndpoint = 'http://localhost:11434';

  /**
   * Tests whether Ollama is reachable and returns list of installed model names.
   */
  async checkHealth(endpoint = this.defaultEndpoint): Promise<{ online: boolean; models: string[] }> {
    try {
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${cleanEndpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { online: false, models: [] };
      }

      const data = await res.json();
      const models = (data.models || []).map((m: OllamaModelInfo) => m.name);
      return { online: true, models };
    } catch {
      return { online: false, models: [] };
    }
  }

  /**
   * Generates a raw text response from Ollama or returns an intelligent heuristic response if offline.
   */
  async generate(
    prompt: string,
    systemPrompt = '',
    endpoint = this.defaultEndpoint,
    model = 'deepseek-r1:8b'
  ): Promise<string> {
    try {
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: 0.4,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Ollama HTTP Error ${res.status}`);
      }

      const data: OllamaGenerateResponse = await res.json();
      return data.response;
    } catch {
      return this.heuristicFallback(prompt, systemPrompt);
    }
  }

  /**
   * Generates blackboard lecture notes for Professor A.Ilson based on the studied concept.
   */
  async generateLecture(
    topic: string,
    studentNotes = '',
    endpoint = this.defaultEndpoint,
    model = 'deepseek-r1:8b'
  ): Promise<ClassroomLectureData> {
    const prompt = `Você é o Professor A.Ilson, um professor rígido, pragmático e muito experiente em C# e Arquitetura de Software.
O aluno acabou de estudar e desenhar na Lousa Mental o seguinte tópico: "${topic}".
Anotações do aluno: "${studentNotes || 'Nenhuma anotação adicional'}".

Responda em formato JSON estrito com a seguinte estrutura:
{
  "topic": "${topic}",
  "whyItExists": "Explique em 1 frase curta e direta por que essa técnica/conceito existe no mundo real",
  "whereToLook": "Onde encontrar a documentação oficial ou padrão do repositório",
  "blackboardAdvice": "Uma dica tática imperativa de como desenhar ou estruturar isso antes de codar",
  "realWorldScenario": "Um caso real de software onde a falta disso causaria um desastre"
}`;

    try {
      const raw = await this.generate(prompt, 'Você é um professor de ciência da computação.', endpoint, model);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      /* fallback */
    }

    return this.heuristicLecture(topic);
  }

  /**
   * Evaluates the student's Feynman explanation discursively.
   */
  async evaluateFeynman(
    topic: string,
    studentExplanation: string,
    endpoint = this.defaultEndpoint,
    model = 'deepseek-r1:8b'
  ): Promise<FeynmanEvaluation> {
    const prompt = `Você é o Professor A.Ilson avaliando a explicação do aluno sobre "${topic}".
Explicação do aluno: "${studentExplanation}".

Avalie com rigor técnico de 0 a 100. Se a explicação for vaga ou incorreta, dê nota abaixo de 60 e peça para revisar. Se capturou o conceito central, dê nota >= 60.

Responda em JSON estrito:
{
  "score": 85,
  "passed": true,
  "feedback": "Mensagem direta do Prof A.Ilson ao aluno apontando pontos fortes e falhas",
  "formalCorrection": "Como um arquiteto sênior resumiria esse conceito formalmente"
}`;

    try {
      const raw = await this.generate(prompt, 'Você é um avaliador acadêmico rígido.', endpoint, model);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      /* fallback */
    }

    return this.heuristicFeynmanEval(topic, studentExplanation);
  }

  // ─── Heuristic Fallbacks ──────────────────────────────────────────────────

  private heuristicLecture(topic: string): ClassroomLectureData {
    const t = topic.toLowerCase();
    if (t.includes('encapsul') || t.includes('private') || t.includes('property')) {
      return {
        topic: 'C# Encapsulamento & Modificadores',
        whyItExists: 'Para proteger invariâncias de negócio e impedir mutações ilegítimas de estado interno.',
        whereToLook: 'Docs oficiais da Microsoft (C# Properties & Access Modifiers) e código do core financeiro.',
        blackboardAdvice: 'Desenhe o fluxo do modificador private e identifique o que deve ter getter público antes de abrir o editor.',
        realWorldScenario: 'Se o saldo de uma conta não for private, qualquer controller pode setar saldo negativo e corromper o banco.',
      };
    }

    if (t.includes('heran') || t.includes('polimorf')) {
      return {
        topic: 'Herança & Polimorfismo Dinâmico',
        whyItExists: 'Para reaproveitar contratos e permitir despacho polimórfico em tempo de execução.',
        whereToLook: 'Design Patterns do Gang of Four (GoF) e docs C# sobre Virtual/Override.',
        blackboardAdvice: 'Trace a árvore genealógica de classes: prefira composição se a relação não for estritamente "É-UM".',
        realWorldScenario: 'Sistemas de pagamento que tratam Pix, Boleto e Cartão através de um método comum Processar().',
      };
    }

    return {
      topic: topic || 'Conceito Fundamental C#',
      whyItExists: 'Para garantir manutenibilidade, isolamento de escopo e desempenho computacional.',
      whereToLook: 'Repositório de arquitetura e documentação de engenharia.',
      blackboardAdvice: 'Estruture o diagrama de blocos na Lousa Mental antes de digitar a primeira linha de código.',
      realWorldScenario: 'Evitar retrabalho estrutural em projetos corporativos escaláveis.',
    };
  }

  private heuristicFeynmanEval(topic: string, text: string): FeynmanEvaluation {
    const len = text.trim().length;
    const lower = text.toLowerCase();

    const hasKeywords =
      lower.includes('privad') ||
      lower.includes('proteg') ||
      lower.includes('acesso') ||
      lower.includes('estado') ||
      lower.includes('objeto') ||
      lower.includes('método') ||
      lower.includes('get') ||
      lower.includes('set') ||
      lower.includes('classe');

    if (len < 15) {
      return {
        score: 35,
        passed: false,
        feedback: '>_ A.ILSON_EVAL: "Resposta rasa demais. Você precisa explicar a causalidade do conceito, não apenas soltar palavras soltas. Volte para a Lousa Mental e revise!"',
        formalCorrection: 'Explique por que ocultar o estado de um objeto protege a integridade do sistema contra efeitos colaterais.',
      };
    }

    if (hasKeywords && len >= 30) {
      return {
        score: 90,
        passed: true,
        feedback: '>_ A.ILSON_EVAL: "Excelente raciocínio. Você compreendeu o cerne do problema e não apenas a sintaxe. Conceito validado e incorporado à sua Árvore Neural!"',
        formalCorrection: `O conceito de ${topic} foi formulado corretamente com foco em segurança de tipos e isolamento de escopo.`,
      };
    }

    return {
      score: 65,
      passed: true,
      feedback: '>_ A.ILSON_EVAL: "Raciocínio aceitável, mas seu vocabulário técnico precisa de polimento. Aprovado com ressalvas."',
      formalCorrection: 'Reforce o uso dos termos canônicos da especificação C#.',
    };
  }

  private heuristicFallback(prompt: string, _systemPrompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes('encapsul')) {
      return `[PROF. A.ILSON]: Encapsulamento oculta a complexidade interna e protege variáveis com private, expondo acessores seguros via Properties.`;
    }
    return `[PROF. A.ILSON]: Raciocínio registrado na matriz neural com sucesso.`;
  }
}

export const ollamaService = new OllamaService();
