import type { TranslationResult } from './types';

// Local "AI" lookup dictionary — fakes a compiler translation based on the
// informal text the user wrote inside a node. Match is case-insensitive and
// keys off Portuguese + English keywords a learner might jot down.
const DICTIONARY: { match: string[]; result: TranslationResult }[] = [
  {
    match: ['herança', 'heranca', 'inherit', 'pai', 'filho', 'molde base', 'superclass', 'subclass', 'extends'],
    result: {
      concept: 'Herança',
      translation:
        'Herança permite que classes compartilhem atributos e métodos, promovendo reuso e hierarquia lógica entre superclasses e subclasses. A subclasse estende a base, herdando seu contrato e podendo sobrescrever comportamentos.',
      keywords: [
        { informal: 'Access Modifier', formal: 'protected' },
        { informal: 'Keyword', formal: 'extends' },
        { informal: 'Base Class', formal: 'base' },
      ],
    },
  },
  {
    match: ['encapsul', 'esconder', 'ocultar', 'privado', 'private', 'proteger'],
    result: {
      concept: 'Encapsulamento',
      translation:
        'Encapsulamento oculta o estado interno de um objeto, expondo apenas operações seguras via acessores. Campos privados garantem invariâncias e reduzem acoplamento entre módulos.',
      keywords: [
        { informal: 'Access Modifier', formal: 'private' },
        { informal: 'Accessor', formal: 'get; set;' },
        { informal: 'Pattern', formal: 'Properties' },
      ],
    },
  },
  {
    match: ['polimorf', 'poly', 'sobrescr', 'override', 'virtual', 'múltiplas formas', 'multiplas formas'],
    result: {
      concept: 'Polimorfismo',
      translation:
        'Polimorfismo permite que referências de um tipo base invoquem implementações especializadas das subclasses em tempo de execução, habilitando despacho dinâmico e código genérico sobre a hierarquia.',
      keywords: [
        { informal: 'Keyword', formal: 'virtual' },
        { informal: 'Override', formal: 'override' },
        { informal: 'Binding', formal: 'dynamic' },
      ],
    },
  },
  {
    match: ['interface', 'contrato', 'contract', 'implements'],
    result: {
      concept: 'Interface',
      translation:
        'Interfaces definem um contrato puro: assinaturas de métodos sem implementação. Uma classe pode realizar múltiplas interfaces, habilitando abstração e desacoplamento total entre camadas.',
      keywords: [
        { informal: 'Keyword', formal: 'interface' },
        { informal: 'Implementation', formal: 'implements' },
        { informal: 'Members', formal: 'signatures only' },
      ],
    },
  },
  {
    match: ['classe', 'class', 'objeto', 'object', 'instância', 'instancia', 'molde', 'new'],
    result: {
      concept: 'Classe',
      translation:
        'Uma classe é um molde que define estado (campos) e comportamento (métodos). A instânciação via new aloca um objeto concreto na heap conforme o molde declarado.',
      keywords: [
        { informal: 'Keyword', formal: 'class' },
        { informal: 'Instance', formal: 'new' },
        { informal: 'Constructor', formal: 'ctor' },
      ],
    },
  },
];

export function translateNode(text: string): TranslationResult {
  const t = (text || '').toLowerCase().trim();
  for (const entry of DICTIONARY) {
    if (entry.match.some((m) => t.includes(m))) return entry.result;
  }
  return {
    concept: text.trim() || 'CONCEITO_DESCONHECIDO',
    translation: `Sem correspondência exata no dicionário local para "${text.trim()}". Refine a anotação com um termo técnico padrão — ex.: herança, encapsulamento, polimorfismo, interface, classe — para acionar a tradução formal.`,
    keywords: [
      { informal: 'Status', formal: 'unmapped' },
      { informal: 'Suggestion', formal: 'use standard term' },
    ],
  };
}
