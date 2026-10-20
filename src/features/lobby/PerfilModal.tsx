import { useStudy } from '../../store/study';
import { Input, Label, Modal, Textarea } from '../../components/ui';

/** Edição do perfil. A bio vai junto nos pedidos ao professor. */
export function PerfilModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useStudy((s) => s.profile);
  const updateProfile = useStudy((s) => s.updateProfile);

  return (
    <Modal open={open} onClose={onClose} title="Perfil">
      <div className="space-y-3">
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
