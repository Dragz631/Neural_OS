import type { ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { criarArmazem } from './conexoes/armazem.ts';
import { criarNotebookLM } from './notebooklm.ts';
import { chamarNotion, tituloDe } from './notion/cliente.ts';

// "Fontes" da faculdade: o que o professor consegue ler agora (Notion e
// NotebookLM), pra tela de Configurações e pra montar a faculdade.

function responder(res: ServerResponse, status: number, dados: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(dados));
}

const erroDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function registrarFontes(server: ViteDevServer, raiz: string) {
  const armazem = criarArmazem(raiz);
  const nlm = criarNotebookLM(raiz, armazem.lerEnv);

  // Mantém a sessão do Google viva enquanto o app estiver ligado.
  void nlm.cutucar();
  setInterval(() => void nlm.cutucar(), 17 * 60 * 1000).unref();

  // Botão "Entrar no Google": POST abre a janela, GET diz em que pé está.
  server.middlewares.use('/api/notebooklm/entrar', async (req, res) => {
    if (req.method === 'POST') await nlm.entrar();
    responder(res, 200, nlm.statusLogin());
  });

  server.middlewares.use('/api/fontes', async (req, res) => {
    const forcar = (req.url ?? '').includes('forcar=1');
    const notion = await (async () => {
      if (!(await armazem.lerEnv()).NOTION_TOKEN) return { conectado: false, erro: 'Sem chave: cole o token em Conexões → Notion.' };
      try {
        const busca = await chamarNotion<{ results: { parent?: { type?: string }; title?: { plain_text: string }[] }[] }>(armazem, 'POST', '/search', { page_size: 100 });
        const paginas = busca.results.filter((r) => r.parent?.type === 'workspace').map((r) => tituloDe(r));
        return { conectado: busca.results.length > 0, paginas, total: busca.results.length, erro: busca.results.length ? undefined : 'A chave funciona, mas nenhuma página foi compartilhada com a conexão "Neural-OS".' };
      } catch (e) {
        return { conectado: false, erro: erroDe(e) };
      }
    })();
    const notebooklm = await nlm
      .cadernos(forcar)
      .then((cadernos) => ({ conectado: true, cadernos }))
      .catch((e) => ({ conectado: false, erro: erroDe(e) }));
    responder(res, 200, { notion, notebooklm });
  });

  // /api/notebooklm/fontes?caderno=ID  ·  /api/notebooklm/texto?caderno=ID&fonte=ID
  server.middlewares.use('/api/notebooklm', async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const caderno = url.searchParams.get('caderno') ?? '';
    try {
      if (url.pathname === '/fontes' && caderno) return responder(res, 200, { fontes: await nlm.fontes(caderno) });
      if (url.pathname === '/texto' && caderno && url.searchParams.get('fonte')) return responder(res, 200, { texto: await nlm.texto(caderno, url.searchParams.get('fonte')!) });
      return responder(res, 404, { erro: 'Rota do NotebookLM não encontrada.' });
    } catch (e) {
      return responder(res, 502, { erro: erroDe(e) });
    }
  });
}
