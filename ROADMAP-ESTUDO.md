# Roadmap: entendendo o Neural-OS por dentro

Cada etapa tem **o que ler**, **a ideia principal** e um **exercício pequeno**. Faça na ordem: cada uma usa a anterior.
Dica: use o próprio Neural-OS pra estudar isso. Crie a matéria "Neural-OS" e um tópico por etapa.

---

## 1. Dados antes de telas: `src/domain/types.ts`
**Ideia:** o app inteiro é só *Subject → Topic → StudySession*. Se você entende os tipos, entende o app.
Compare com o antigo `TrackId = 'csharp' | 'c_bases' | 'lfa'` (veja no commit `09e7289`): era por isso que nada era personalizável.
**Exercício:** adicione um campo `difficulty: 1 | 2 | 3` em `Topic`. Deixe o TypeScript apontar todos os lugares que quebram, e conserte.

## 2. Datas: `src/domain/dates.ts`
**Ideia:** `new Date().toISOString().slice(0,10)` devolve a data em **UTC**. No Brasil, depois das 21h ela já é "amanhã". Bug clássico que o código antigo tinha.
**Exercício:** escreva `isWeekend(date)` usando `weekdayIndex`.

## 3. Revisão espaçada: `src/domain/srs.ts` ⭐
**Ideia:** algoritmo SM-2 simplificado. É o que faz o conteúdo não sumir. Leia `applyGrade` com papel do lado e simule: tópico novo → "Lembrei" → "Lembrei" → "Esqueci". Anote os intervalos.
**Exercício:** hoje "Fácil" no primeiro acerto dá 3 dias. Mude pra 4 e veja o efeito na tela do Professor.

## 4. Planejar por energia: `src/domain/planner.ts`
**Ideia:** `adaptDay` é uma função **pura**: recebe plano + check-in e devolve o dia ajustado. Não sabe nada de React, então dá pra testar sozinha.
**Exercício:** com energia **alta** e tempo sobrando, adicione automaticamente um "Desafio bônus" de 10 min.

## 5. Estado global: `src/store/study.ts`
**Ideia:** Zustand + `persist` substituiu 17 `useEffect` que salvavam no localStorage. Repare na regra dos **seletores**: `useStudy(s => s.topics.filter(...))` cria array novo a cada render e trava o app. Por isso filtros ficam em `useMemo`.
**Exercício:** crie a ação `renameSubject` e use na Árvore.

## 6. Um componente de ponta a ponta: `src/features/professor/Professor.tsx`
**Ideia:** siga um clique em "Lembrei": `finish` → `gradeTopic` (store) → `applyGrade` (domínio) → re-render. Esse caminho (UI → store → domínio) é o mesmo em todas as abas.
**Exercício:** mostre no painel quantas sessões você já fez nesse tópico.

## 7. Falar com a IA: `src/services/ai/client.ts` e `professor.ts`
**Ideia:** três coisas que o código antigo fazia errado:
1. esconder erro com resposta pronta (agora lança `AIError`);
2. regex gulosa pra achar JSON (agora `extractJSONObject` conta chaves);
3. confiar no formato que a IA mandou (agora cada campo é validado).
Leia os prompts em `professor.ts`: é ali que "personalizar" acontece, porque a função `describe()` manda suas anotações e notas.
**Exercício:** faça a aula também receber as últimas 3 explicações que você escreveu (estão em `session.note`).

## 8. Servidor e segredos: `server/devApi.ts` + `vite.config.ts`
**Ideia:** o navegador não pode guardar chave de API (qualquer um vê no F12). O servidor do Vite faz de **proxy** e coloca a chave. Veja também a checagem de `../` que impede gravar fora do cofre.
**Exercício:** mande pro cofre também um `Neural-OS/Indice.md` com a lista de todos os tópicos.

## 9. Desenhar com matemática: `src/domain/tree.ts`
**Ideia:** layout radial = coordenadas polares (`r·cos θ`, `r·sin θ`). Cada galho ganha um pedaço do círculo proporcional às folhas. É trigonometria de Cálculo aplicada.
**Exercício:** faça tópicos com domínio ≥ 80 ficarem um pouco mais pra fora (r maior), como se "brotassem".

## 10. Ler código ruim (commit `09e7289`)
**Ideia:** abra `src/components/Sandbox.tsx` antigo e ache: o compilador de mentira, o `\x1b[31m` na tela, a dica do desafio errado, o `setInterval` que nunca para. Saber reconhecer código "bonito que não funciona" vale tanto quanto escrever.
**Exercício:** liste 3 sinais de alerta pra você perceber isso mais cedo quando uma IA te entregar código.

---

**Próximas reformas (pra fazermos juntos):** Lousa mental · Árvore com "desbloqueio" estilo MMO · Professor sugerindo o próximo tópico · plano semanal montado pela IA.
