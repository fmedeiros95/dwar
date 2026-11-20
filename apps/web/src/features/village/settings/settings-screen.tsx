import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { api, ApiError, type Gender, type VillageSnapshot } from '@dwar/api-client';

const modes = [
  { code: 'profile', label: 'Perfil' },
  { code: 'password', label: 'Senha' },
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
    <div className="market-layout">
      <aside>
        <table className="legacy-table market-menu">
          <thead>
            <tr>
              <th>Submenus</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((item) => (
              <tr key={item.code}>
                <td>
                  <button className="text-button" onClick={() => navigate(item.code)}>
                    {mode === item.code ? '» ' : ''}
                    {item.label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
      <section className="market-content">
        {error ? (
          <p className="error" role="alert">
            {error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.'}
          </p>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {mode === 'profile' ? (
          profile.data ? (
            <form onSubmit={submitProfile}>
              <table className="legacy-table">
                <tbody>
                  <tr>
                    <th colSpan={2}>Perfil</th>
                  </tr>
                  <tr>
                    <td>Avatar:</td>
                    <td>
                      {profile.data.avatarUrl ? (
                        <div>
                          <img
                            src={profile.data.avatarUrl}
                            alt="Avatar"
                            style={{ display: 'block', marginBottom: 4, maxWidth: 160 }}
                          />
                          <button
                            type="button"
                            className="text-button"
                            disabled={deleteAvatar.isPending}
                            onClick={() => deleteAvatar.mutate()}
                          >
                            Remover avatar
                          </button>
                        </div>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif"
                        disabled={uploadAvatar.isPending}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) uploadAvatar.mutate(file);
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Sexo:</td>
                    <td>
                      <label>
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === 'm'}
                          onChange={() => setGender('m')}
                        />{' '}
                        Masculino
                      </label>{' '}
                      <label>
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === 'f'}
                          onChange={() => setGender('f')}
                        />{' '}
                        Feminino
                      </label>{' '}
                      <label>
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === 'x'}
                          onChange={() => setGender('x')}
                        />{' '}
                        Não informar
                      </label>
                    </td>
                  </tr>
                  <tr>
                    <td>Idade:</td>
                    <td>
                      <input
                        value={age}
                        onChange={(event) => setAge(event.currentTarget.value.replace(/\D/g, ''))}
                        size={3}
                        maxLength={2}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Localização:</td>
                    <td>
                      <input
                        value={location}
                        onChange={(event) => setLocation(event.currentTarget.value)}
                        maxLength={60}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th colSpan={2}>Texto pessoal</th>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <textarea
                        value={personalText}
                        onChange={(event) => setPersonalText(event.currentTarget.value)}
                        rows={6}
                        style={{ width: '100%' }}
                        maxLength={4000}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <button className="button" disabled={update.isPending}>
                        OK
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
          ) : (
            <p>Carregando perfil…</p>
          )
        ) : null}
        {mode === 'password' ? (
          <form onSubmit={submitPassword}>
            <table className="legacy-table">
              <tbody>
                <tr>
                  <th colSpan={2}>Trocar senha</th>
                </tr>
                <tr>
                  <td>Senha atual:</td>
                  <td>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.currentTarget.value)}
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <td>Nova senha:</td>
                  <td>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.currentTarget.value)}
                      minLength={10}
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <td>Confirmar nova senha:</td>
                  <td>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                      minLength={10}
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <button className="button" disabled={changePassword.isPending}>
                      OK
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        ) : null}
      </section>
    </div>
  );
}
