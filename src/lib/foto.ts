import { fotoParaAscii } from '../domain/avatares';

// Foto de perfil própria: recorta o meio em quadrado e reduz (fica leve pra sincronizar
// entre PC e celular). Também converte em ASCII, pra combinar com o visual do app.

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      falha(new Error('Não consegui abrir essa imagem.'));
    };
    img.src = url;
  });
}

/** Desenha o centro quadrado da imagem num canvas de `lado` x `alto`. */
function desenhar(img: HTMLImageElement, lado: number, alto = lado): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = lado;
  c.height = alto;
  const ctx = c.getContext('2d')!;
  const menor = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - menor) / 2, (img.naturalHeight - menor) / 2, menor, menor, 0, 0, lado, alto);
  return ctx;
}

/** Imagem → quadrado de 256 px em JPEG (uns 20–40 KB). */
export async function fotoQuadrada(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  const img = await carregar(arquivo);
  return desenhar(img, 256).canvas.toDataURL('image/jpeg', 0.85);
}

/** Uma foto (data URL) → ASCII de 32 colunas por 16 linhas (a letra é mais alta que larga). */
export async function fotoEmAscii(dataUrl: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error('Não consegui ler a foto.'));
    i.src = dataUrl;
  });
  const cols = 32;
  const linhas = 16;
  const ctx = desenhar(img, cols, linhas);
  const px = ctx.getImageData(0, 0, cols, linhas).data;
  const cinza: number[][] = [];
  for (let y = 0; y < linhas; y++) {
    const linha: number[] = [];
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      linha.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    }
    cinza.push(linha);
  }
  return fotoParaAscii(cinza);
}
