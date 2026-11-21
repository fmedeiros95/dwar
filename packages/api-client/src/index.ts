// This initial contract will be generated from OpenAPI when the API surface grows.
export type ResourceCode = 'wood' | 'stone' | 'iron';
export type Resources = Record<ResourceCode, number>;
export type Account = { id: number; username: string; email: string; graphicalOverview: boolean };
export type RegistrationChallenge = {
  token: string;
  expression: string;
  expiresAt: string;
  serverTime: string;
};
export type World = {
  id: number;
  slug: string;
  name: string;
  buildSpeed: number;
  productionSpeed: number;
  /** Velocidade das tropas (só o tempo de viagem), em milésimos; 1000 = normal. */
  unitSpeed: number;
  maxBuildQueue: number;
  rulesVersion: string;
  /** Aldeias bárbaras criadas a cada jogador novo. */
  barbarianVillagesPerPlayer: number;
  /** Pontuação-limite da evolução automática das bárbaras; 0 = desligada. */
  barbarianMaxPoints: number;
};
export type WorldEntry = { world: World; villageId: number | null };
export type Construction = {
  id: number;
  buildingCode: string;
  name: string;
  targetLevel: number;
  startsAt: string;
  endsAt: string;
};
export type BuildingView = {
  code: string;
  name: string;
  description: string;
  level: number;
  queuedLevel: number;
  maxLevel: number;
  cost: Resources;
  population: number;
  durationSeconds: number;
  canBuild: boolean;
  unavailableReason: string | null;
  requirements: { code: string; name: string; level: number; met: boolean }[];
  resourcesAvailableAt: string | null;
  /** Indicadores do edifício: valor agora, no próximo nível (null no máximo) e no nível máximo. */
  details: {
    label: string;
    unit: string;
    current: number;
    next: number | null;
    max: number;
    icon?: string;
  }[];
};
export type TechnologyView = {
  code: string;
  name: string;
  cost: Resources;
  durationSeconds: number;
  status: 'researched' | 'researching' | 'available' | 'unavailable';
  endsAt: string | null;
  requirements: { name: string; level: number; met: boolean }[];
  unavailableReason: string | null;
};
export type RecruitmentOrder = { unitCode: string; quantity: number };
export type UnitView = {
  code: string;
  name: string;
  building: string;
  cost: Resources;
  population: number;
  durationSeconds: number;
  researched: boolean;
  maxRecruitable: number;
  unavailableReason: string | null;
  indoors: number;
  total: number;
  present: number;
};
export type Recruitment = {
  id: number;
  buildingCode: string;
  unitCode: string;
  name: string;
  quantity: number;
  /** Unidades do lote que já saíram (o lote é entregue aos poucos). */
  delivered: number;
  /** Tempo de cada unidade, em segundos. */
  unitSeconds: number;
  startsAt: string;
  endsAt: string;
};
export type AcademyView = {
  coins: number;
  coinsRequired: number;
  coinsMissing: number;
  noblesInProgress: number;
  noblesFromVillage: number;
  canRecruit: boolean;
  recruitUnavailableReason: string | null;
  recruitResourcesAvailableAt: string | null;
  coinCost: Resources;
  canMint: boolean;
  mintUnavailableReason: string | null;
  mintResourcesAvailableAt: string | null;
};
/** Situação do jogador no mundo: pontos de todas as aldeias somadas e posição no ranking. */
export type PlayerStanding = {
  points: number;
  rank: number;
  players: number;
  villages: number;
  rankTitle: string;
};
export type VillageSnapshot = {
  serverTime: string;
  player: PlayerStanding;
  world: World;
  village: {
    id: number;
    name: string;
    x: number;
    y: number;
    points: number;
    loyalty: number;
    resources: Resources;
    productionPerHour: Resources;
    capacity: number;
    populationUsed: number;
    populationCapacity: number;
  };
  buildings: BuildingView[];
  queue: Construction[];
  technologies: TechnologyView[];
  units: UnitView[];
  academy: AcademyView;
  recruitmentQueue: Recruitment[];
  activity: { id: number; message: string; occurredAt: string }[];
};

export type TradeTarget = { id: number; name: string; x: number; y: number; username: string };
export type TradePreview = {
  target: TradeTarget;
  resources: Resources;
  merchants: number;
  durationSeconds: number;
  arrivesAt: string;
  /** Aldeia de origem, distância em campos e horários da viagem (os mercadores voltam depois). */
  origin: { id: number; name: string; x: number; y: number };
  distance: number;
  departsAt: string;
  returnsAt: string;
  /** Velocidade do mundo em milésimos (1000 = normal). */
  worldSpeed: number;
  merchantsAvailable: number;
  /** Quanto os mercadores levam no total (mercadores × capacidade de cada um). */
  capacity: number;
  /** Recursos que sobram na aldeia depois do envio. */
  remaining: Resources;
};
export type ShipmentView = {
  id: number;
  from: TradeTarget;
  to: TradeTarget;
  mode: string;
  resources: Resources;
  merchants: number;
  startsAt: string;
  endsAt: string;
  cancelUntil: string | null;
};
export type OfferView = {
  id: number;
  village: TradeTarget;
  sellResource: ResourceCode;
  buyResource: ResourceCode;
  sellAmount: number;
  buyAmount: number;
  merchants: number;
  createdAt: string;
  durationSeconds: number;
  ratio: number;
  canAccept: boolean;
  unavailableReason: string | null;
};
export type MarketSnapshot = {
  serverTime: string;
  villageId: number;
  resources: Resources;
  totalMerchants: number;
  availableMerchants: number;
  outgoingMerchants: number;
  returningMerchants: number;
  reservedMerchants: number;
  transportCapacity: number;
  outgoing: ShipmentView[];
  incoming: ShipmentView[];
  ownOffers: OfferView[];
  otherOffers: OfferView[];
};
export type MarketAction =
  | { type: 'send'; targetId: number; resources: Resources }
  | {
      type: 'create_offer';
      sellResource: ResourceCode;
      buyResource: ResourceCode;
      sellAmount: number;
      buyAmount: number;
    }
  | { type: 'cancel_offer' | 'accept_offer' | 'cancel_shipment'; id: number };

export type TroopCounts = Record<string, number>;
export type PublicVillage = TradeTarget & {
  playerId: number | null;
  tribe: TribeRef | null;
  playerPoints: number;
  points: number;
  own: boolean;
};
export type Gender = 'm' | 'f' | 'x';
export type PublicPlayer = {
  id: number;
  username: string;
  tribe: TribeRef | null;
  points: number;
  rank: number;
  own: boolean;
  gender: Gender | null;
  age: number | null;
  location: string | null;
  personalText: string | null;
  avatarUrl: string | null;
  villages: PublicVillage[];
};
export type RankingEntry = {
  rank: number;
  id: number;
  username: string;
  tribe: TribeRef | null;
  points: number;
  villageCount: number;
  joinedAt: string;
  own: boolean;
  rankTier: number;
  rankTitle: string;
};
/** Painéis do ranking: jogadores, jogadores de um continente e pontos de batalha. */
/** Ranking de tribos: por pontos ou por unidades derrotadas pelos membros (atacando, defendendo ou total). */
export type TribeRankingMetric = 'points' | 'att' | 'def' | 'all';
export type TribeRankingEntry = {
  rank: number;
  id: number;
  name: string;
  tag: string;
  /** Pontos ou unidades derrotadas, conforme a medida escolhida. */
  value: number;
  members: number;
  villages: number;
  own: boolean;
};
export type TribeRankingPage = {
  metric: TribeRankingMetric;
  mode: 'list' | 'search';
  page: number;
  pageCount: number;
  ownPage: number;
  total: number;
  entries: TribeRankingEntry[];
};
export type RankingBoard = 'player' | 'continent' | 'kills' | 'medals';
/** Pontos de batalha: unidades derrotadas atacando, defendendo ou as duas somadas. */
export type RankingKillType = 'att' | 'def' | 'all';
export type RankingPage = {
  board: RankingBoard;
  type: RankingKillType;
  continent: number;
  mode: 'list' | 'search';
  page: number;
  pageCount: number;
  ownPage: number;
  total: number;
  entries: RankingEntry[];
};
export type ProfileSettings = {
  gender: Gender | null;
  age: number | null;
  location: string | null;
  personalText: string | null;
  avatarUrl: string | null;
};
export type ProfilePatch = {
  personalText?: string | null;
  gender?: Gender | null;
  age?: number | null;
  location?: string | null;
};
export type MapSettings = {
  width: number;
  height: number;
  minimapSize: number;
  contextMenu: boolean;
  popup: boolean;
  popupUnits: boolean;
  popupTimes: boolean;
  reportDots: boolean;
};
export type MapMark = { playerId: number; username: string; color: string };
export type MapAction =
  | { type: 'settings'; settings: MapSettings }
  | { type: 'mark'; username: string; color: string }
  | { type: 'unmark'; playerId: number };
/** Detalhes do popup de uma aldeia do mapa (como no popup do Speed Wars). */
export type VillagePopupInfo = {
  id: number;
  continent: number;
  /** Distância em campos até a aldeia atual; 0 se for a própria. */
  distance: number;
  abandoned: boolean;
  own: boolean;
  current: boolean;
  /** Fim da proteção de iniciante do dono, se ainda valer. */
  protectedUntil: string | null;
  /** Moral que o jogador teria atacando esta aldeia; null se for sua. */
  morale: number | null;
  /** Atacar este alvo esbarra na proporção máxima de pontos. */
  pointRatioBlocked: boolean;
  units: {
    code: string;
    name: string;
    /** Tropas da própria aldeia presentes nela; null quando a aldeia não é sua. */
    home: number | null;
    /** Tropas de apoio de outras aldeias presentes nela; null quando não é sua. */
    foreign: number | null;
    /** Tempo de viagem de uma unidade a partir da aldeia atual, em segundos. */
    seconds: number | null;
  }[];
};
/** Ordem de tropas em andamento sobre uma aldeia do mapa (ícone no estilo Speed Wars/Tribal Wars). */
export type MapCommand = {
  villageId: number;
  /** attack/support: tropas suas a caminho; return: tropas suas voltando desta aldeia. */
  kind: 'attack' | 'support' | 'return';
  /** Ataque de outro jogador a caminho de uma aldeia sua. */
  incoming: boolean;
  count: number;
};
/** Resultado do seu último ataque a uma aldeia do mapa (ponto colorido ao lado dela). */
export type MapReportDot = {
  villageId: number;
  reportId: number;
  /** verde: venceu sem perder tropas; amarelo: venceu com perdas ou empatou; vermelho: perdeu. */
  dot: 'green' | 'yellow' | 'red';
};
export type MapSnapshot = {
  center: { x: number; y: number };
  villages: PublicVillage[];
  commands: MapCommand[];
  reports: MapReportDot[];
  /** Tribo de quem consulta; as aldeias dela são pintadas de azul no mapa. */
  ownTribeId: number | null;
  /** Como a tribo de quem consulta enxerga as outras (aliada, pacto, inimiga ou em guerra). */
  tribeRelations: Record<number, RelationKind>;
  settings: MapSettings;
  marks: MapMark[];
};
export type SupportPreview = {
  kind: 'support' | 'attack';
  morale: number | null;
  targetBuilding: string | null;
  target: PublicVillage;
  troops: TroopCounts;
  durationSeconds: number;
  arrivesAt: string;
  origin: { id: number; name: string; x: number; y: number };
  /** Distância em campos. */
  distance: number;
  departsAt: string;
  /** Quando as tropas voltam, se nenhuma morrer (só em ataques). */
  returnsAt: string | null;
  /** Velocidades em milésimos (1000 = normal): a do mundo e a das tropas. */
  speeds: { world: number; units: number };
  /** A unidade mais lenta, que define o tempo de viagem do grupo. */
  slowest: { code: string; name: string };
  population: number;
  /** Quanto as tropas conseguem carregar de saque (só em ataques). */
  carry: number | null;
  /** Tropas que continuam na aldeia depois do envio. */
  remaining: TroopCounts;
};
export type RallyAction =
  | { type: 'attack'; targetId: number; troops: TroopCounts; targetBuilding?: string }
  | { type: 'cancel'; movementId: number }
  | { type: 'support'; targetId: number; troops: TroopCounts }
  | { type: 'recall'; locationId: number };
export type RallySnapshot = {
  catapultTargets: { code: string; name: string }[];
  serverTime: string;
  unitTypes: { code: string; name: string }[];
  home: TroopCounts;
  guests: TroopCounts;
  stationed: { location: PublicVillage; troops: TroopCounts }[];
  movements: {
    id: number;
    kind: 'support' | 'return' | 'attack';
    cancelUntil: string | null;
    origin: PublicVillage;
    from: PublicVillage;
    to: PublicVillage;
    troops: TroopCounts;
    startsAt: string;
    endsAt: string;
  }[];
};
export type IncomingCommand = {
  id: number;
  kind: 'attack' | 'support';
  from: PublicVillage;
  to: PublicVillage;
  sender: string;
  startsAt: string;
  endsAt: string;
};
export type IncomingOverview = {
  serverTime: string;
  attacks: number;
  supports: number;
  commands: IncomingCommand[];
};

export type MailStatus = 'answered' | 'new' | 'read';
export type MailPerson = { id: number; username: string };
export type MessageNode =
  | { type: 'text'; text: string }
  | { type: 'b' | 'i' | 'u' | 's' | 'center' | 'quote'; children: MessageNode[] }
  | { type: 'color'; color: string; children: MessageNode[] }
  | { type: 'size'; size: number; children: MessageNode[] }
  | { type: 'spoiler'; title: string; children: MessageNode[] }
  | { type: 'list'; items: MessageNode[][] }
  | { type: 'link'; href: string; children: MessageNode[] }
  | { type: 'image'; src: string }
  | { type: 'player' | 'village' | 'tribe'; id: number; label: string };
/** Tipos de destino que um link dentro de uma mensagem pode abrir. */
export type MessageTarget = 'player' | 'village' | 'tribe';
export type MailSummary = {
  id: number;
  title: string;
  partner: MailPerson;
  status: MailStatus;
  partnerStatus: MailStatus;
  postCount: number;
  lastPostAt: string;
};
export type MailboxSnapshot = {
  page: number;
  pageCount: number;
  total: number;
  unread: number;
  threads: MailSummary[];
  blocked: MailPerson[];
};
export type MailThreadView = MailSummary & {
  posts: {
    id: number;
    author: MailPerson;
    text: string;
    content: MessageNode[];
    createdAt: string;
  }[];
};
export type MailAction =
  | { type: 'send'; recipient: string; title: string; text: string }
  | { type: 'reply'; threadId: number; text: string }
  | { type: 'read'; threadId: number }
  | { type: 'delete'; threadIds: number[] }
  | { type: 'block'; username: string }
  | { type: 'unblock'; playerId: number };

export type ReportSide = {
  villageId: number;
  playerId: number | null;
  name: string;
  username: string;
  x: number;
  y: number;
};
/** Referência curta a uma tribo (nome e tag), usada junto aos nomes dos jogadores. */
export type TribeRef = { id: number; name: string; tag: string };
export type TribeRightsView = {
  isFounder: boolean;
  canLead: boolean;
  canInvite: boolean;
  canDiplomacy: boolean;
  canMassMail: boolean;
  canModerate: boolean;
  canHiddenForum: boolean;
};
export type TribeMemberView = {
  playerId: number;
  username: string;
  title: string;
  points: number;
  villages: number;
  rank: number;
  joinedAt: string;
  rights: TribeRightsView;
};
/** Perfil público de uma tribo. */
export type TribeProfile = {
  id: number;
  name: string;
  tag: string;
  points: number;
  rank: number;
  villages: number;
  createdAt: string;
  description: MessageNode[];
  members: { playerId: number; username: string; title: string; points: number; rank: number }[];
  /** O jogador que consulta faz parte desta tribo. */
  isMember: boolean;
  /** Relações declaradas e guerras em andamento, públicas. */
  relations: {
    ally: TribeRef[];
    nap: TribeRef[];
    enemy: TribeRef[];
    wars: { id: number; title: string; other: TribeRef }[];
  };
};
export type TribeInviteView = {
  id: number;
  player: { id: number; username: string };
  invitedBy: string;
  createdAt: string;
};
export type MyTribeInvite = { id: number; tribe: TribeRef; invitedBy: string; createdAt: string };
export type TribeEventView = { id: number; createdAt: string; content: MessageNode[] };
/** A tribo do próprio jogador, com tudo o que só os membros veem. */
export type RelationKind = 'ally' | 'nap' | 'enemy';
export type TribeRelationView = {
  id: number;
  tribe: TribeRef;
  kind: RelationKind;
  createdAt: string;
};
export type TribeWarView = {
  id: number;
  title: string;
  declaration: MessageNode[];
  other: TribeRef;
  declaredByUs: boolean;
  declaredAt: string;
  endedAt: string | null;
  /** Pedido de paz em aberto: quem fez. */
  peace: { offeredByUs: boolean } | null;
  /** Batalhas e unidades derrotadas entre as duas tribos durante a guerra. */
  stats: { ourAttacks: number; theirAttacks: number; ourKills: number; theirKills: number };
};
export type TribeDiplomacy = {
  /** Relações que a nossa tribo declarou. */
  declared: TribeRelationView[];
  /** Relações que outras tribos declararam em relação à nossa. */
  received: TribeRelationView[];
  wars: TribeWarView[];
  endedWars: TribeWarView[];
};
export type TribeOverview = {
  diplomacy: TribeDiplomacy;
  profile: TribeProfile;
  /** Texto bruto (BBCode) para edição. */
  descriptionText: string;
  internalText: string;
  internalContent: MessageNode[];
  me: { playerId: number; rights: TribeRightsView };
  members: TribeMemberView[];
  invites: TribeInviteView[];
  events: TribeEventView[];
  limits: { members: number };
};
export type TribeHome = {
  tribe: TribeOverview | null;
  invites: MyTribeInvite[];
  /** Resultado da última ação, quando ela tem um (mensagem em massa). */
  result?: { massMail: { sent: number; skipped: number; repeated: boolean } };
};
export type TribeAction =
  | { type: 'create'; name: string; tag: string }
  | { type: 'leave' }
  | { type: 'disband' }
  | { type: 'invite'; username: string }
  | { type: 'cancel_invite'; inviteId: number }
  | { type: 'accept_invite'; inviteId: number }
  | { type: 'decline_invite'; inviteId: number }
  | { type: 'set_relation'; tag: string; kind: RelationKind }
  | { type: 'cancel_relation'; relationId: number }
  | { type: 'declare_war'; tag: string; title: string; declaration: string }
  | { type: 'offer_peace'; warId: number }
  | { type: 'withdraw_peace'; warId: number }
  | { type: 'accept_peace'; warId: number }
  | { type: 'reject_peace'; warId: number }
  | { type: 'mass_mail'; title: string; text: string; requestId: string }
  | { type: 'kick'; playerId: number }
  | { type: 'rights'; playerId: number; title: string; rights: Partial<TribeRightsView> }
  | {
      type: 'edit';
      name?: string;
      tag?: string;
      description?: string;
      internalText?: string;
    };
export type PlayerNote = {
  /** Aldeia da nota; nulo na nota geral. */
  villageId: number | null;
  village: { name: string; x: number; y: number } | null;
  text: string;
  content: MessageNode[];
  updatedAt: string | null;
};
export type NotesOverview = {
  general: PlayerNote;
  villages: {
    villageId: number;
    name: string;
    x: number;
    y: number;
    excerpt: string;
    updatedAt: string;
  }[];
};
/** Uma medalha de um jogador: nível (0 a 4), valor atual e o que falta para o próximo nível. */
export type MedalView = {
  code: string;
  name: string;
  description: string;
  kind: 'count' | 'rank';
  unit: string;
  stage: number;
  tier: string | null;
  value: number;
  needs: number[];
  /** Frase do nível que já tem; nulo sem medalha. */
  current: string | null;
  /** Objetivo do próximo nível; nulo no nível máximo. */
  next: string | null;
  nextValue: number | null;
};
export type MedalsOverview = {
  playerId: number;
  username: string;
  total: number;
  maximum: number;
  medals: MedalView[];
};
export type ReportGroup = 'all' | 'attack' | 'defense' | 'support' | 'trade' | 'other';
/** Relatórios de batalha e avisos (comércio, chegada de apoio) têm numerações separadas. */
export type ReportRef = { source: 'battle' | 'notice'; id: number };
export type ReportAction =
  | { type: 'delete'; items: ReportRef[] }
  | { type: 'delete'; group: ReportGroup }
  | { type: 'read'; items?: ReportRef[]; group?: ReportGroup }
  | { type: 'unread'; items: ReportRef[] };
export type ReportPlace = { name: string; username: string; x: number; y: number };
export type BattleReportSummary = {
  source: 'battle';
  id: number;
  title: string;
  occurredAt: string;
  role: 'attacker' | 'defender' | 'support';
  group: Exclude<ReportGroup, 'all' | 'trade'>;
  read: boolean;
  winner: 'attacker' | 'defender' | 'draw';
  /** Resultado do ponto de vista de quem lê: vitória, derrota ou empate. */
  outcome: 'won' | 'lost' | 'draw';
  origin: ReportPlace;
  target: ReportPlace;
  /** Saque total (só para quem atacou). */
  lootTotal: number;
  lootFull: boolean;
  conquered: boolean;
  spy: boolean;
  lossless: boolean;
};
export type NoticeReportSummary = {
  source: 'notice';
  id: number;
  kind: 'trade' | 'support' | 'medal' | 'tribe';
  group: 'trade' | 'support' | 'other';
  title: string;
  occurredAt: string;
  read: boolean;
  /** Se quem lê enviou ou recebeu os recursos ou o apoio; nulo nas medalhas. */
  role: 'sender' | 'receiver' | null;
  origin: ReportPlace | null;
  target: ReportPlace | null;
};
export type ReportSummary = BattleReportSummary | NoticeReportSummary;
export type BattleReportView = BattleReportSummary & {
  previous: ReportRef | null;
  next: ReportRef | null;
  from: ReportSide;
  to: ReportSide;
  unitTypes: { code: string; name: string }[];
  attacker: TroopCounts | null;
  attackerLosses: TroopCounts | null;
  defender: TroopCounts | null;
  defenderLosses: TroopCounts | null;
  supportTroops: TroopCounts | null;
  supportLosses: TroopCounts | null;
  luck: number | null;
  morale: number | null;
  loot: Resources | null;
  lootCapacity: number | null;
  wall: { before: number; after: number } | null;
  demolition: { code: string; before: number; after: number } | null;
  loyalty: { before: number; after: number; conquered: boolean } | null;
  intel: {
    resources?: Resources;
    buildings?: Record<string, number>;
    outsideTroops?: TroopCounts;
  } | null;
};
export type NoticeReportView = NoticeReportSummary & {
  previous: ReportRef | null;
  next: ReportRef | null;
  from: ReportSide | null;
  to: ReportSide | null;
  medal: MedalView | null;
  mode: 'normal' | 'offer' | null;
  resources: Resources | null;
  troops: TroopCounts | null;
  unitTypes: { code: string; name: string }[];
};
export type ReportsSnapshot = {
  page: number;
  pageCount: number;
  total: number;
  unread: number;
  group: ReportGroup;
  groups: Record<ReportGroup, { total: number; unread: number }>;
  reports: ReportSummary[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const data = (await response
      .json()
      .catch(() => ({ message: 'Não foi possível conectar ao servidor.' }))) as {
      message?: string;
    };
    throw new ApiError(data.message ?? 'Não foi possível concluir a ação.', response.status);
  }
  return response.json() as Promise<T>;
}

async function requestForm<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    method: init?.method ?? 'POST',
    credentials: 'same-origin',
    body: form,
  });
  if (!response.ok) {
    const data = (await response
      .json()
      .catch(() => ({ message: 'Não foi possível conectar ao servidor.' }))) as {
      message?: string;
    };
    throw new ApiError(data.message ?? 'Não foi possível concluir a ação.', response.status);
  }
  return response.json() as Promise<T>;
}

export function newRequestKey(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
    n.toString(16).padStart(8, '0'),
  ).join('');
}

export const api = {
  reports: (worldId: number, page = 1, villageId?: number, group: ReportGroup = 'all') =>
    request<ReportsSnapshot>(
      `/worlds/${worldId}/reports?page=${page}${villageId ? `&villageId=${villageId}` : ''}${group === 'all' ? '' : `&group=${group}`}`,
    ),
  reportAction: (worldId: number, action: ReportAction) =>
    request<{ changed: number }>(`/worlds/${worldId}/reports`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
  report: (worldId: number, reportId: number) =>
    request<BattleReportView>(`/worlds/${worldId}/reports/${reportId}`),
  medals: (worldId: number) => request<MedalsOverview>(`/worlds/${worldId}/medals`),
  playerMedals: (worldId: number, playerId: number) =>
    request<MedalsOverview>(`/worlds/${worldId}/medals/players/${playerId}`),
  tribeRanking: (
    worldId: number,
    options: { page?: number; search?: string; metric?: TribeRankingMetric } = {},
  ) => {
    const query = new URLSearchParams();
    if (options.metric && options.metric !== 'points') query.set('metric', options.metric);
    if (options.search) query.set('search', options.search);
    else if (options.page) query.set('page', String(options.page));
    const text = query.toString();
    return request<TribeRankingPage>(`/worlds/${worldId}/ranking/tribes${text ? `?${text}` : ''}`);
  },
  tribes: (worldId: number) => request<TribeHome>(`/worlds/${worldId}/tribes`),
  tribe: (worldId: number, tribeId: number) =>
    request<TribeProfile>(`/worlds/${worldId}/tribes/${tribeId}`),
  tribeAction: (worldId: number, action: TribeAction) =>
    request<TribeHome>(`/worlds/${worldId}/tribes/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
  notes: (worldId: number) => request<NotesOverview>(`/worlds/${worldId}/notes`),
  note: (worldId: number, villageId: number) =>
    request<PlayerNote>(`/worlds/${worldId}/notes/villages/${villageId}`),
  saveNote: (worldId: number, text: string, villageId?: number) =>
    request<PlayerNote>(`/worlds/${worldId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ text, ...(villageId ? { villageId } : {}) }),
    }),
  notice: (worldId: number, reportId: number) =>
    request<NoticeReportView>(`/worlds/${worldId}/reports/notices/${reportId}`),
  me: () => request<Account>('/auth/me'),
  login: (username: string, password: string) =>
    request<Account>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  registrationChallenge: () => request<RegistrationChallenge>('/auth/register/challenge'),
  register: (
    username: string,
    email: string,
    password: string,
    challengeToken: string,
    captcha: string,
  ) =>
    request<Account>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, challengeToken, captcha }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  overviewPreference: (graphicalOverview: boolean) =>
    request<Account>('/auth/preferences/overview', {
      method: 'POST',
      body: JSON.stringify({ graphicalOverview }),
    }),
  worlds: () => request<World[]>('/worlds'),
  worldBySlug: (slug: string) => request<World>(`/worlds/by-slug/${encodeURIComponent(slug)}`),
  mailbox: (worldId: number, page = 1) =>
    request<MailboxSnapshot>(`/worlds/${worldId}/mail?page=${page}`),
  mailThread: (worldId: number, threadId: number) =>
    request<MailThreadView>(`/worlds/${worldId}/mail/${threadId}`),
  mailAction: (worldId: number, action: MailAction, requestId: string) =>
    request<{ threadId: number | null }>(`/worlds/${worldId}/mail`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify(action),
    }),
  previewMail: (worldId: number, text: string) =>
    request<{ text: string; content: MessageNode[] }>(`/worlds/${worldId}/mail/preview`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  enterWorld: (worldId: number) =>
    request<WorldEntry>(`/worlds/${worldId}/join`, { method: 'POST' }),
  createVillage: (worldId: number) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages`, { method: 'POST' }),
  village: (worldId: number, villageId?: number) =>
    request<VillageSnapshot>(`/worlds/${worldId}/village${villageId ? `?id=${villageId}` : ''}`),
  publicVillage: (worldId: number, villageId: number, targetId: number) =>
    request<PublicVillage>(`/worlds/${worldId}/villages/${villageId}/map/villages/${targetId}`),
  villagePopup: (worldId: number, villageId: number, targetId: number) =>
    request<VillagePopupInfo>(
      `/worlds/${worldId}/villages/${villageId}/map/villages/${targetId}/popup`,
    ),
  publicPlayer: (worldId: number, villageId: number, playerId: number) =>
    request<PublicPlayer>(`/worlds/${worldId}/villages/${villageId}/map/players/${playerId}`),
  build: (worldId: number, villageId: number, buildingCode: string, requestId: string) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages/${villageId}/buildings`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify({ buildingCode }),
    }),
  market: (worldId: number, villageId: number) =>
    request<MarketSnapshot>(`/worlds/${worldId}/villages/${villageId}/market`),
  mapAction: (worldId: number, villageId: number, action: MapAction) =>
    request<void>(`/worlds/${worldId}/villages/${villageId}/map`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
  map: (worldId: number, villageId: number, x: number, y: number, span?: number) =>
    request<MapSnapshot>(
      `/worlds/${worldId}/villages/${villageId}/map?x=${x}&y=${y}${span ? `&span=${span}` : ''}`,
    ),
  rally: (worldId: number, villageId: number) =>
    request<RallySnapshot>(`/worlds/${worldId}/villages/${villageId}/rally`),
  incomings: (worldId: number) => request<IncomingOverview>(`/worlds/${worldId}/incomings`),
  previewSupport: (
    worldId: number,
    villageId: number,
    x: number,
    y: number,
    troops: TroopCounts,
    kind: 'support' | 'attack' = 'support',
    targetBuilding?: string,
  ) =>
    request<SupportPreview>(`/worlds/${worldId}/villages/${villageId}/rally/preview`, {
      method: 'POST',
      body: JSON.stringify({ x, y, troops, kind, targetBuilding }),
    }),
  rallyAction: (worldId: number, villageId: number, action: RallyAction, requestId: string) =>
    request<RallySnapshot>(`/worlds/${worldId}/villages/${villageId}/rally`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify(action),
    }),
  previewTrade: (worldId: number, villageId: number, x: number, y: number, resources: Resources) =>
    request<TradePreview>(`/worlds/${worldId}/villages/${villageId}/market/preview`, {
      method: 'POST',
      body: JSON.stringify({ x, y, resources }),
    }),
  marketAction: (worldId: number, villageId: number, action: MarketAction, requestId: string) =>
    request<MarketSnapshot>(`/worlds/${worldId}/villages/${villageId}/market`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify(action),
    }),
  academy: (worldId: number, villageId: number, action: 'mint' | 'recruit', requestId: string) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages/${villageId}/academy/${action}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
    }),
  recruit: (
    worldId: number,
    villageId: number,
    buildingCode: string,
    orders: RecruitmentOrder[],
    requestId: string,
  ) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages/${villageId}/recruitment`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify({ buildingCode, orders }),
    }),
  cancelRecruitment: (worldId: number, villageId: number, eventId: number) =>
    request<VillageSnapshot>(
      `/worlds/${worldId}/villages/${villageId}/recruitment/${eventId}/cancel`,
      { method: 'POST' },
    ),
  research: (worldId: number, villageId: number, technologyCode: string, requestId: string) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages/${villageId}/research`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify({ technologyCode }),
    }),
  cancelConstruction: (worldId: number, villageId: number, eventId: number) =>
    request<VillageSnapshot>(
      `/worlds/${worldId}/villages/${villageId}/constructions/${eventId}/cancel`,
      { method: 'POST' },
    ),
  renameVillage: (worldId: number, villageId: number, name: string) =>
    request<VillageSnapshot>(`/worlds/${worldId}/villages/${villageId}/name`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  ranking: (
    worldId: number,
    options: {
      page?: number;
      search?: string;
      board?: RankingBoard;
      type?: RankingKillType;
      continent?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (options.board && options.board !== 'player') query.set('board', options.board);
    if (options.board === 'kills' && options.type) query.set('type', options.type);
    if (options.board === 'continent' && options.continent !== undefined)
      query.set('continent', String(options.continent));
    if (options.search) query.set('search', options.search);
    else if (options.page) query.set('page', String(options.page));
    const search = query.toString();
    return request<RankingPage>(`/worlds/${worldId}/ranking${search ? `?${search}` : ''}`);
  },
  profile: (worldId: number) => request<ProfileSettings>(`/worlds/${worldId}/profile`),
  updateProfile: (worldId: number, patch: ProfilePatch) =>
    request<ProfileSettings>(`/worlds/${worldId}/profile`, {
      method: 'POST',
      body: JSON.stringify(patch),
    }),
  uploadAvatar: (worldId: number, file: File) => {
    const form = new FormData();
    form.set('avatar', file);
    return requestForm<ProfileSettings>(`/worlds/${worldId}/profile/avatar`, form);
  },
  deleteAvatar: (worldId: number) =>
    request<ProfileSettings>(`/worlds/${worldId}/profile/avatar`, { method: 'DELETE' }),
  changePassword: (oldPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ ok: boolean }>('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    }),
};
