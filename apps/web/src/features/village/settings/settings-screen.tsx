import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { api, ApiError, type Gender, type VillageSnapshot } from '@dwar/api-client';
import { ImageUp, KeyRound, UserRound } from 'lucide-react';
import { SegmentedTabs } from '../../../components/segmented-tabs.js';
import { PanelCard } from '../shared/panel-head.js';

const modes = [
  { code: 'profile', label: 'Perfil', icon: <UserRound size={15} /> },
  { code: 'password', label: 'Senha', icon: <KeyRound size={15} /> },
];

const genders: { code: Gender; label: string }[] = [
  { code: 'm', label: 'Masculino' },
  { code: 'f', label: 'Feminino' },
  { code: 'x', label: 'Não informar' },
];

export function SettingsScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const worldId = snapshot.world.id;
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'password' ? 'password' : 'profile';
  const profile = useQuery({
    queryKey: ['profile', worldId],
    queryFn: () => api.profile(worldId),
  });
  const [personalText, setPersonalText] = useState(''),
    [gender, setGender] = useState<Gender | ''>(''),
    [age, setAge] = useState(''),
    [location, setLocation] = useState('');
  useEffect(() => {
    if (!profile.data) return;
    setPersonalText(profile.data.personalText ?? '');
    setGender(profile.data.gender ?? '');
    setAge(profile.data.age === null ? '' : String(profile.data.age));
    setLocation(profile.data.location ?? '');
  }, [profile.data]);
  const [notice, setNotice] = useState('');
  const update = useMutation({
    mutationFn: api.updateProfile.bind(null, worldId),
    onSuccess: (result) => {
      client.setQueryData(['profile', worldId], result);
      setNotice('Perfil atualizado.');
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(worldId, file),
    onSuccess: (result) => {
      client.setQueryData(['profile', worldId], result);
      setNotice('Avatar atualizado.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });
  const deleteAvatar = useMutation({
    mutationFn: () => api.deleteAvatar(worldId),
    onSuccess: (result) => {
      client.setQueryData(['profile', worldId], result);
      setNotice('Avatar removido.');
    },
  });
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    update.mutate({
      personalText,
      gender: gender || null,
      age: age.trim() === '' ? null : Number(age),
      location,
    });
  }
  const [oldPassword, setOldPassword] = useState(''),
    [newPassword, setNewPassword] = useState(''),
    [confirmPassword, setConfirmPassword] = useState('');
  const changePassword = useMutation({
    mutationFn: () => api.changePassword(oldPassword, newPassword, confirmPassword),
    onSuccess: () => {
      setNotice('Senha alterada.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });
  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    changePassword.mutate();
  }
  function navigate(nextMode: string) {
    setNotice('');
    update.reset();
    changePassword.reset();
    setParams({ village: snapshot.village.id, screen: 'settings', mode: nextMode });
  }
  const error =
    profile.error ??
    update.error ??
    uploadAvatar.error ??
    deleteAvatar.error ??
    changePassword.error;
  return (
    <div className="building-panel settings-panel">
      <SegmentedTabs label="Seções dos ajustes" value={mode} onChange={navigate} items={modes} />
      <section className="settings-content">
        {error ? (
          <p className="error" role="alert">
            {error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.'}
          </p>
        ) : null}
        {notice ? (
          <p className="settings-notice" role="status">
            {notice}
          </p>
        ) : null}
        {mode === 'profile' ? (
          profile.data ? (
            <form className="settings-form" onSubmit={submitProfile}>
              <PanelCard title="Avatar" icon={<ImageUp size={16} aria-hidden="true" />}>
                <div className="settings-avatar">
                  {profile.data.avatarUrl ? (
                    <img src={profile.data.avatarUrl} alt="Seu avatar" />
                  ) : (
                    <span aria-hidden="true">
                      <UserRound size={30} />
                    </span>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      id="settings-avatar"
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/gif"
                      disabled={uploadAvatar.isPending}
                      aria-describedby="settings-avatar-hint"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) uploadAvatar.mutate(file);
                      }}
                    />
                    <label htmlFor="settings-avatar" className="button">
                      {uploadAvatar.isPending ? 'Enviando…' : 'Escolher imagem'}
                    </label>
                    {profile.data.avatarUrl ? (
                      <button
                        type="button"
                        className="text-button"
                        disabled={deleteAvatar.isPending}
                        onClick={() => deleteAvatar.mutate()}
                      >
                        Remover avatar
                      </button>
                    ) : null}
                    <small id="settings-avatar-hint">PNG, JPEG ou GIF.</small>
                  </div>
                </div>
              </PanelCard>
              <PanelCard title="Sobre você" icon={<UserRound size={16} aria-hidden="true" />}>
                <div className="settings-fields">
                  <fieldset>
                    <legend>Sexo</legend>
                    {genders.map((item) => (
                      <label key={item.code}>
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === item.code}
                          onChange={() => setGender(item.code)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </fieldset>
                  <label className="settings-age">
                    Idade
                    <input
                      value={age}
                      onChange={(event) => setAge(event.currentTarget.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      maxLength={2}
                    />
                  </label>
                  <label className="settings-place">
                    Localização
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.currentTarget.value)}
                      maxLength={60}
                    />
                  </label>
                  <label className="settings-text">
                    Texto pessoal
                    <textarea
                      value={personalText}
                      onChange={(event) => setPersonalText(event.currentTarget.value)}
                      rows={3}
                      maxLength={4000}
                    />
                  </label>
                </div>
                <button disabled={update.isPending}>Salvar perfil</button>
              </PanelCard>
            </form>
          ) : (
            <p>Carregando perfil…</p>
          )
        ) : null}
        {mode === 'password' ? (
          <form className="settings-form" onSubmit={submitPassword}>
            <PanelCard title="Trocar senha" icon={<KeyRound size={16} aria-hidden="true" />}>
              <div className="settings-password">
                <label>
                  Senha atual
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.currentTarget.value)}
                    required
                  />
                </label>
                <label>
                  Nova senha
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.currentTarget.value)}
                    minLength={10}
                    aria-describedby="settings-password-hint"
                    required
                  />
                  <small id="settings-password-hint">Pelo menos 10 caracteres.</small>
                </label>
                <label>
                  Confirmar nova senha
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                    minLength={10}
                    required
                  />
                </label>
              </div>
              <button disabled={changePassword.isPending}>Trocar senha</button>
            </PanelCard>
          </form>
        ) : null}
      </section>
    </div>
  );
}
