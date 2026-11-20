import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  newRequestKey,
  type RecruitmentOrder,
  type VillageSnapshot,
} from '@dwar/api-client';

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
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
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
    onSuccess: (result) => {
      recruitmentIntent.current = null;
      setRecruitmentVersion((value) => value + 1);
      applySnapshot(result);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) recruitmentIntent.current = null;
    },
  });
  const academy = useMutation({
    mutationFn: (intent: VillageIntent & { action: 'mint' | 'recruit' }) =>
      api.academy(intent.worldId, intent.villageId, intent.action, intent.requestId),
    onSuccess: (result) => {
      academyIntent.current = null;
      applySnapshot(result);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) academyIntent.current = null;
    },
  });
  const cancelRecruitment = useMutation({
    mutationFn: (id: number) => api.cancelRecruitment(worldId, villageId!, id),
    onSuccess: applySnapshot,
  });
  const research = useMutation({
    mutationFn: (code: string) => api.research(worldId, villageId!, code, newRequestKey()),
    onSuccess: applySnapshot,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api.cancelConstruction(worldId, villageId!, id),
    onSuccess: applySnapshot,
  });
  const rename = useMutation({
    mutationFn: (value: string) => api.renameVillage(worldId, villageId!, value),
    onSuccess: (result) => {
      onRenameSuccess();
      applySnapshot(result);
    },
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
  };
}
