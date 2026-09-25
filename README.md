# Neural-OS

Ferramenta pessoal de estudo: **um lugar só** para aprender uma matéria, anotar, praticar e nunca esquecer.
Funciona inteira sem IA. Com IA (Hermes Agent / NVIDIA NIM / Ollama), o Prof. A.Ilson personaliza aulas, avaliações e desafios usando as suas anotações e o seu histórico.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Os dados ficam no navegador (faça backup em ⚙ Configurações).

## Configurar IA e Obsidian

1. Copie `.env.example` para `.env.local` e preencha o que for usar.
2. Reinicie o `npm run dev`.
3. No app: ⚙ (canto superior direito) → escolha o provedor → 🔄 buscar modelos → **Testar conexão**.

As chaves ficam só no `.env.local` (fora do git). O navegador chama `/ai/<provedor>` e o servidor do Vite repassa com a chave (`server/devApi.ts`).

## Como as abas se conectam

| Aba | Pra quê |
|---|---|
| **Lobby** | Target (o que estou aprendendo), missões de hoje, revisões vencidas, constância |
| **Árvore** | Matérias → tópicos → tópicos derivados. Cresce conforme você cria e domina |
| **Prof. A.Ilson** | Quadro (explicação, pontos-chave, vídeos, onde pesquisar, dicas) + suas anotações + "prove que entendeu" |
| **Sandbox** | Desafios do que você já estudou; correção de lógica e sintaxe sem executar |
| **Molda-Horário** | Planejar a semana (domingo) + check-in diário de energia/tempo que ajusta o dia |
| **Lousa** | Mapa mental livre (reforma pendente) |
| **Dungeon** | Modo diversão de fim de semana (trilhas fixas C#, C, LFA) |

Toda avaliação (explicação ou desafio) alimenta a **revisão espaçada**: o tópico volta pra revisão em 1, 3, 7… dias conforme você lembra.

## Estrutura

```
server/devApi.ts      proxy de IA + gravação no Obsidian (roda dentro do Vite)
src/domain/           regras puras, sem React: tipos, datas, revisão espaçada, planner, árvore, XP
src/store/            estado (Zustand + persist): study, settings, nav, toast
src/services/         IA (cliente OpenAI-compatível + prompts do professor) e Obsidian
src/components/       peças de interface reutilizáveis
src/features/<aba>/   uma pasta por aba
```

Atalhos: teclas `1`–`7` trocam de aba.
