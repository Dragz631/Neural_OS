import { useRef, useState } from 'react';
import { ImagePlus, Type } from 'lucide-react';
import { useStudy } from '../../store/study';
import { Button, Input, Label, Modal, Textarea } from '../../components/ui';
import { AvatarAscii, AvatarPerfil } from '../../components/AvatarAscii';
import { Orbe } from '../../components/Orbe';
import { useAvatares } from '../../lib/avatares';
import { fotoEmAscii, fotoQuadrada } from '../../lib/foto';
import { cn } from '../../lib/utils';
import type { Avatar } from '../../domain/avatares';

function Grade({ lista, atual, onEscolher }: { lista: Avatar[]; atual?: string; onEscolher: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {lista.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onEscolher(a.id)}
          className={cn('flex flex-col items-center gap-1 rounded border p-1.5 text-[10px] text-muted hover:border-accent hover:text-fg', atual === a.id ? 'border-accent bg-accent/10 text-accent' : 'border-line')}
          title={a.nome}
          aria-pressed={atual === a.id}
        >
          <AvatarAscii avatar={a} tamanho={64} />
          <span className="w-full truncate text-center">{a.nome}</span>
        </button>
      ))}
    </div>
  );
}

/** Edição do perfil. A bio vai junto nos pedidos ao professor. */
export function PerfilModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useStudy((s) => s.profile);
  const updateProfile = useStudy((s) => s.updateProfile);
  const avatares = useAvatares();
  const arquivo = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string>();
  const meus = avatares.filter((a) => a.origem === 'meu');
  const comuns = avatares.filter((a) => a.origem === 'comum');

  const escolherFoto = async (f?: File) => {
    if (!f) return;
    setErro(undefined);
    try {
      updateProfile({ foto: await fotoQuadrada(f), avatar: 'foto', fotoAscii: undefined });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra usar essa imagem.');
    }
  };
  const virarAscii = async () => {
    if (!profile.foto) return;
    try {
      updateProfile({ fotoAscii: await fotoEmAscii(profile.foto), avatar: 'foto-ascii' });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra converter.');
    }
  };

  const escolher = (id: string) => updateProfile({ avatar: id });

  return (
    <Modal open={open} onClose={onClose} title="Perfil">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AvatarPerfil tamanho={88} />
          <div className="min-w-0 text-xs text-muted">
            <p className="font-bold text-fg">Foto de perfil</p>
            <p>Escolha um ícone ASCII animado ou use uma imagem sua.</p>
          </div>
        </div>

        {meus.length > 0 && (
          <section>
            <Label>Os meus</Label>
            <Grade lista={meus} atual={profile.avatar} onEscolher={escolher} />
          </section>
        )}
        <section>
          <Label>{meus.length ? 'Comuns' : 'Ícones'}</Label>
          <div className="mb-2">
            <button
              type="button"
              onClick={() => updateProfile({ avatar: undefined })}
              className={cn('flex items-center gap-2 rounded border px-2 py-1 text-[10px] text-muted hover:border-accent', !profile.avatar ? 'border-accent text-accent' : 'border-line')}
            >
              <Orbe tamanho={22} /> Orbe (padrão)
            </button>
          </div>
          <Grade lista={comuns} atual={profile.avatar} onEscolher={escolher} />
        </section>

        <section className="space-y-2">
          <Label>Uma imagem sua</Label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => arquivo.current?.click()}>
              <ImagePlus size={14} /> {profile.foto ? 'Trocar a imagem' : 'Usar uma imagem minha'}
            </Button>
            {profile.foto && (
              <>
                <Button onClick={() => updateProfile({ avatar: 'foto' })} className={cn(profile.avatar === 'foto' && 'border-accent text-accent')}>
                  Usar como está
                </Button>
                <Button onClick={virarAscii} className={cn(profile.avatar === 'foto-ascii' && 'border-accent text-accent')}>
                  <Type size={14} /> Transformar em ASCII
                </Button>
              </>
            )}
          </div>
          <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => void escolherFoto(e.target.files?.[0])} />
          {erro && <p className="text-xs text-warn">{erro}</p>}
          <p className="text-[10px] text-muted">A imagem é cortada em quadrado e reduzida. Fica só com você (no PC e no seu celular).</p>
        </section>

        <label className="block">
          <Label>Nome</Label>
          <Input value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
        </label>
        <label className="block">
          <Label>Título (ex.: Estudante de CC · foco em backend)</Label>
          <Input value={profile.title ?? ''} onChange={(e) => updateProfile({ title: e.target.value })} />
        </label>
        <label className="block">
          <Label>Pro professor saber de você</Label>
          <Textarea
            rows={4}
            value={profile.bio ?? ''}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            placeholder="O que você quer alcançar, o que já sabe, como prefere aprender."
          />
        </label>
        <p className="text-[11px] text-muted">Salva sozinho.</p>
      </div>
    </Modal>
  );
}
