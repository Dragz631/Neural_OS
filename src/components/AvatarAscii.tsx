import { useEffect, useMemo, useState } from 'react';
import type { Avatar, CorAvatar } from '../domain/avatares';
import { useAvatares } from '../lib/avatares';
import { useStudy } from '../store/study';
import { Orbe } from './Orbe';

const CLASSE: Record<CorAvatar, string> = { accent: 'text-accent', warn: 'text-warn', info: 'text-info', danger: 'text-danger', muted: 'text-muted', fg: 'text-fg' };

/** Quem prefere menos movimento (configuração do sistema) vê o 1º quadro parado. */
const semMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Desenha um avatar ASCII dentro de um quadrado de `tamanho` px, animando os quadros. */
export function AvatarAscii({ avatar, tamanho, animar = true }: { avatar: Avatar; tamanho: number; animar?: boolean }) {
  const [i, setI] = useState(0);
  const total = avatar.quadros.length;
  useEffect(() => {
    if (!animar || total < 2 || semMovimento()) return;
    const id = setInterval(() => setI((n) => (n + 1) % total), avatar.ms);
    return () => clearInterval(id);
  }, [animar, total, avatar.ms]);

  const quadro = avatar.quadros[i % total] ?? avatar.quadros[0];
  const cols = Math.max(1, quadro[0]?.length ?? 1);
  const linhas = Math.max(1, quadro.length);
  // Letra monoespaçada: largura ~0,6 da altura. Cabe inteiro no quadrado.
  const fonte = Math.min(tamanho / (cols * 0.6), tamanho / (linhas * 1.15));

  // Agrupa letras seguidas da mesma cor num <span> só (leve, mesmo animando).
  const pedacos = useMemo(
    () =>
      quadro.map((linha) => {
        const out: { t: string; c?: CorAvatar }[] = [];
        for (const ch of linha) {
          const c = avatar.cores[ch];
          const ult = out[out.length - 1];
          if (ult && ult.c === c) ult.t += ch;
          else out.push({ t: ch, c });
        }
        return out;
      }),
    [quadro, avatar.cores],
  );

  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-bg" style={{ width: tamanho, height: tamanho }} role="img" aria-label={avatar.nome}>
      <pre className="m-0 select-none font-mono text-fg/80" style={{ fontSize: fonte, lineHeight: 1.15 }} aria-hidden>
        {pedacos.map((linha, n) => (
          <div key={n}>
            {linha.map((p, k) => (
              <span key={k} className={p.c ? CLASSE[p.c] : undefined}>
                {p.t}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}

/** A foto de perfil escolhida: avatar ASCII, foto própria, foto virada ASCII, ou o Orbe (padrão). */
export function AvatarPerfil({ tamanho }: { tamanho: number }) {
  const profile = useStudy((s) => s.profile);
  const avatares = useAvatares();
  const escolhido = profile.avatar;

  if (escolhido === 'foto' && profile.foto) {
    return <img src={profile.foto} alt="Foto de perfil" width={tamanho} height={tamanho} className="shrink-0 rounded border border-line object-cover" style={{ width: tamanho, height: tamanho }} />;
  }
  if (escolhido === 'foto-ascii' && profile.fotoAscii?.length) {
    const a: Avatar = { id: 'foto-ascii', nome: 'Minha foto em ASCII', ms: 1000, cores: {}, quadros: [profile.fotoAscii], origem: 'meu' };
    return <AvatarAscii avatar={a} tamanho={tamanho} animar={false} />;
  }
  const av = avatares.find((x) => x.id === escolhido);
  if (av) return <AvatarAscii avatar={av} tamanho={tamanho} />;
  return <Orbe tamanho={tamanho} />;
}
