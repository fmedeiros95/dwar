import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  newRequestKey,
  type RecruitmentOrder,
  type VillageSnapshot,
} from '@dwar/api-client';
import { useToast } from '../../components/toast.js';

type VillageIntent = { worldId: number; villageId: number; requestId: string };

export function useVillageActions({
  worldId,
  villageId,
  onLogout,
  onRenameSuccess,
}: {
  worldId: number;
  villageId: number | undefined;
  onLogout: () => Promise<void>;
  onRenameSuccess: () => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  // Obras canceladas pelo jogador: o desaparecimento delas da fila não é uma conclusão.
  const cancelledConstructions = useRef(new Set<number>());
  const failure = (title: string) => (error: Error) => toast.error(title, error.message);
  const [recruitmentVersion, setRecruitmentVersion] = useState(0);
  const academyIntent = useRef<(VillageIntent & { action: 'mint' | 'recruit' }) | null>(null);
  const recruitmentIntent = useRef<
    | (VillageIntent & {
        buildingCode: string;
        orders: RecruitmentOrder[];
        requestId: string;
      })
    | null
  >(null);
  const intent = useRef<(VillageIntent & { buildingCode: string }) | null>(null);

  function applySnapshot(result: VillageSnapshot) {
    client.setQueriesData<VillageSnapshot>({ queryKey: ['village', result.world.id] }, (old) =>
      old?.village.id === result.village.id ? result : old,
    );
    client.setQueryData(['village', result.world.id, result.village.id], result);
    void client.invalidateQueries({ queryKey: ['village', result.world.id] });
  }

  const build = useMutation({
    mutationFn: (action: VillageIntent & { buildingCode: string }) =>
      api.build(action.worldId, action.villageId, action.buildingCode, action.requestId),
    onSuccess: (result) => {
      intent.current = null;
      applySnapshot(result);
      const queued = result.queue.at(-1);
      toast.success(
        result.queue.length > 1 ? 'Obra na fila' : 'Obra iniciada',
        queued ? `${queued.name}, nível ${queued.targetLevel}` : undefined,
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        intent.current = null;
        toast.error('Não foi possível construir', error.message);
      }
    },
  });
  const recruitment = useMutation({
    mutationFn: (action: VillageIntent & { buildingCode: string; orders: RecruitmentOrder[] }) =>
      api.recruit(
        action.worldId,
        action.villageId,
        action.buildingCode,
        action.orders,
        action.requestId,
      ),
    onSuccess: (result, action) => {
      recruitmentIntent.current = null;
      setRecruitmentVersion((value) => value + 1);
      applySnapshot(result);
      const total = action.orders.reduce((sum, order) => sum + order.quantity, 0);
      toast.success('Treinamento iniciado', `${total} ${total === 1 ? 'unidade' : 'unidades'}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        recruitmentIntent.current = null;
        toast.error('Recrutamento não realizado', error.message);
      }
    },
  });
  const academy = useMutation({
    mutationFn: (intent: VillageIntent & { action: 'mint' | 'recruit' }) =>
      api.academy(intent.worldId, intent.villageId, intent.action, intent.requestId),
    onSuccess: (result, action) => {
      academyIntent.current = null;
      applySnapshot(result);
      toast.success(action.action === 'mint' ? 'Moeda cunhada' : 'Nobre em treinamento');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        academyIntent.current = null;
        toast.error('Ação da Academia não realizada', error.message);
      }
    },
  });
  const cancelRecruitment = useMutation({
    mutationFn: (id: number) => api.cancelRecruitment(worldId, villageId!, id),
    onSuccess: (result) => {
      applySnapshot(result);
      toast.info('Treinamento cancelado', 'Os recursos foram devolvidos.');
    },
    onError: failure('Não foi possível cancelar'),
  });
  const research = useMutation({
    mutationFn: (code: string) => api.research(worldId, villageId!, code, newRequestKey()),
    onSuccess: (result) => {
      applySnapshot(result);
      toast.success('Pesquisa iniciada');
    },
    onError: failure('Não foi possível pesquisar'),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api.cancelConstruction(worldId, villageId!, id),
    onMutate: (id) => {
      cancelledConstructions.current.add(id);
    },
    onSuccess: (result) => {
      applySnapshot(result);
      toast.info('Obra cancelada', 'Os recursos foram devolvidos.');
    },
    onError: (error, id) => {
      cancelledConstructions.current.delete(id);
      failure('Não foi possível cancelar a obra')(error);
    },
  });
  const rename = useMutation({
    mutationFn: (value: string) => api.renameVillage(worldId, villageId!, value),
    onSuccess: (result) => {
      onRenameSuccess();
      applySnapshot(result);
      toast.success('Aldeia renomeada', result.village.name);
    },
    onError: failure('Não foi possível renomear'),
  });
  const preference = useMutation({
    mutationFn: api.overviewPreference,
    onSuccess: (result) => client.setQueryData(['account'], result),
  });
  const logout = useMutation({ mutationFn: onLogout });

  function construct(code: string) {
    const action = intent.current ?? {
      worldId,
      villageId: villageId!,
      buildingCode: code,
      requestId: newRequestKey(),
    };
    intent.current = action;
    build.mutate(action);
  }
  function recruit(buildingCode: string, orders: RecruitmentOrder[]) {
    const action = recruitmentIntent.current ?? {
      worldId,
      villageId: villageId!,
      buildingCode,
      orders,
      requestId: newRequestKey(),
    };
    recruitmentIntent.current = action;
    recruitment.mutate(action);
  }
  function academyAction(action: 'mint' | 'recruit') {
    const intent = academyIntent.current ?? {
      worldId,
      villageId: villageId!,
      action,
      requestId: newRequestKey(),
    };
    academyIntent.current = intent;
    academy.mutate(intent);
  }

  return {
    build,
    recruitment,
    academy,
    cancelRecruitment,
    research,
    cancel,
    rename,
    preference,
    logout,
    construct,
    recruit,
    academyAction,
    intent,
    recruitmentIntent,
    academyIntent,
    recruitmentVersion,
    cancelledConstructions,
  };
}
