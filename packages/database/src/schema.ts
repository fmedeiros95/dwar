import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  check,
  foreignKey,
  boolean,
  primaryKey,
  bigint,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type {
  BuildingLevels,
  Resources,
  Troops,
  MapSettings,
  BattleRecord,
  NoticePayload,
} from '@dwar/game-config';

const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' }).notNull();

export const accounts = pgTable(
  'accounts',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    username: text('username').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    graphicalOverview: boolean('graphical_overview').notNull().default(true),
    gender: text('gender').$type<'m' | 'f' | 'x'>(),
    age: integer('age'),
    locationText: text('location_text'),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('accounts_username_ci').on(sql`lower(${table.username})`),
    check(
      'accounts_gender_check',
      sql`${table.gender} IS NULL OR ${table.gender} IN ('m','f','x')`,
    ),
    check('accounts_age_check', sql`${table.age} IS NULL OR ${table.age} BETWEEN 0 AND 79`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    expiresAt: time('expires_at'),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [index('sessions_expiry_idx').on(table.expiresAt)],
);

export const registrationChallenges = pgTable(
  'registration_challenges',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    tokenHash: text('token_hash').notNull().unique(),
    browserKeyHash: text('browser_key_hash').notNull().unique(),
    answer: integer('answer').notNull(),
    expiresAt: time('expires_at'),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    index('registration_challenges_expiry_idx').on(table.expiresAt),
    check('registration_challenges_answer_range', sql`${table.answer} BETWEEN 2 AND 50`),
  ],
);

export const worlds = pgTable(
  'worlds',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    rulesVersion: text('rules_version').notNull(),
    buildSpeed: integer('build_speed').notNull(),
    productionSpeed: integer('production_speed').notNull(),
    /** Velocidade das tropas em milésimos (só o tempo de viagem); 1000 = normal. */
    unitSpeed: integer('unit_speed').notNull().default(1000),
    maxBuildQueue: integer('max_build_queue').notNull(),
    /** Aldeias bárbaras criadas a cada jogador novo. */
    barbarianVillagesPerPlayer: integer('barbarian_villages_per_player').notNull().default(1),
    /** Pontuação-limite até onde as aldeias bárbaras evoluem sozinhas; 0 desliga. */
    barbarianMaxPoints: integer('barbarian_max_points').notNull().default(0),
  },
  (table) => [
    check(
      'world_positive_settings',
      sql`${table.buildSpeed} > 0 AND ${table.productionSpeed} > 0 AND ${table.maxBuildQueue} > 0`,
    ),
  ],
);

export const players = pgTable(
  'players',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    protectionUntil: time('protection_until').default(sql`now() + interval '25 minutes'`),
    lastConqueredAt: timestamp('last_conquered_at', { withTimezone: true }),
    personalText: text('personal_text'),
    avatarPath: text('avatar_path'),
    /** Pontos de batalha: unidades inimigas derrotadas atacando e defendendo. */
    unitsKilledAttack: bigint('units_killed_attack', { mode: 'number' }).notNull().default(0),
    unitsKilledDefense: bigint('units_killed_defense', { mode: 'number' }).notNull().default(0),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('players_account_world_idx').on(table.accountId, table.worldId),
    uniqueIndex('players_id_world_idx').on(table.id, table.worldId),
  ],
);

export const villages = pgTable(
  'villages',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    playerId: integer('player_id'),
    loyalty: doublePrecision('loyalty').notNull().default(100),
    loyaltyUpdatedAt: time('loyalty_updated_at').defaultNow(),
    foundedAsBarbarian: boolean('founded_as_barbarian').notNull().default(false),
    /** Quando uma aldeia bárbara sobe o próximo nível; nulo se não há o que evoluir. */
    growthAt: timestamp('growth_at', { withTimezone: true }),
    name: text('name').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    wood: doublePrecision('wood').notNull(),
    stone: doublePrecision('stone').notNull(),
    iron: doublePrecision('iron').notNull(),
    populationUsed: integer('population_used').notNull(),
    points: integer('points').notNull(),
    buildings: jsonb('buildings').$type<BuildingLevels>().notNull(),
    updatedAt: time('updated_at'),
  },
  (table) => [
    uniqueIndex('villages_world_coordinates_idx').on(table.worldId, table.x, table.y),
    uniqueIndex('villages_id_world_idx').on(table.id, table.worldId),
    index('villages_owner_idx').on(table.playerId, table.worldId),
    foreignKey({
      columns: [table.playerId, table.worldId],
      foreignColumns: [players.id, players.worldId],
    }),
    check(
      'villages_nonnegative_state',
      sql`${table.wood} >= 0 AND ${table.stone} >= 0 AND ${table.iron} >= 0 AND ${table.populationUsed} >= 0 AND ${table.points} >= 0`,
    ),
  ],
);

export const constructionEvents = pgTable(
  'construction_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    buildingCode: text('building_code').notNull(),
    targetLevel: integer('target_level').notNull(),
    startsAt: time('starts_at'),
    endsAt: time('ends_at'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cost: jsonb('cost').$type<Resources>().notNull(),
    population: integer('population').notNull(),
    requestId: text('request_id').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('construction_request_idx').on(table.villageId, table.requestId),
    index('construction_pending_idx')
      .on(table.worldId, table.endsAt, table.id)
      .where(sql`${table.completedAt} IS NULL AND ${table.cancelledAt} IS NULL`),
    foreignKey({
      columns: [table.villageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    check(
      'construction_valid_schedule',
      sql`${table.endsAt} >= ${table.startsAt} AND ${table.targetLevel} > 0`,
    ),
    check(
      'construction_one_terminal_state',
      sql`${table.completedAt} IS NULL OR ${table.cancelledAt} IS NULL`,
    ),
  ],
);

export const activity = pgTable(
  'activity',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    message: text('message').notNull(),
    occurredAt: time('occurred_at'),
  },
  (table) => [
    index('activity_village_time_idx').on(table.villageId, table.occurredAt),
    foreignKey({
      columns: [table.villageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
  ],
);

export const researchEvents = pgTable(
  'research_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    technologyCode: text('technology_code').notNull(),
    startsAt: time('starts_at'),
    endsAt: time('ends_at'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cost: jsonb('cost').$type<Resources>().notNull(),
    requestId: text('request_id').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('research_village_technology_idx').on(table.villageId, table.technologyCode),
    uniqueIndex('research_request_idx').on(table.villageId, table.requestId),
    index('research_pending_idx')
      .on(table.worldId, table.endsAt, table.id)
      .where(sql`${table.completedAt} IS NULL`),
    foreignKey({
      columns: [table.villageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    check('research_valid_schedule', sql`${table.endsAt} > ${table.startsAt}`),
    check(
      'research_valid_technology',
      sql`${table.technologyCode} IN ('sword','axe','archer','spy','light','heavy','ram','catapult')`,
    ),
  ],
);

export const recruitmentEvents = pgTable(
  'recruitment_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    buildingCode: text('building_code').notNull(),
    unitCode: text('unit_code').notNull(),
    quantity: integer('quantity').notNull(),
    /** Unidades já entregues: o lote sai aos poucos, uma a cada `unitSeconds`. */
    deliveredQuantity: integer('delivered_quantity').notNull().default(0),
    unitSeconds: integer('unit_seconds').notNull(),
    startsAt: time('starts_at'),
    endsAt: time('ends_at'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cost: jsonb('cost').$type<Resources>().notNull(),
    population: integer('population').notNull(),
    requestId: text('request_id').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('recruitment_request_unit_idx').on(
      table.villageId,
      table.requestId,
      table.unitCode,
    ),
    index('recruitment_pending_idx')
      .on(table.worldId, table.endsAt, table.id)
      .where(sql`${table.completedAt} IS NULL AND ${table.cancelledAt} IS NULL`),
    index('recruitment_queue_idx')
      .on(table.villageId, table.buildingCode, table.startsAt, table.id)
      .where(sql`${table.completedAt} IS NULL AND ${table.cancelledAt} IS NULL`),
    foreignKey({
      columns: [table.villageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    check(
      'recruitment_valid_quantity',
      sql`${table.quantity} BETWEEN 1 AND 99999 AND ${table.unitSeconds} >= 1 AND ${table.population} > 0`,
    ),
    check(
      'recruitment_valid_schedule',
      sql`${table.endsAt} = ${table.startsAt} + ${table.quantity} * ${table.unitSeconds} * interval '1 second'`,
    ),
    check(
      'recruitment_one_terminal_state',
      sql`${table.completedAt} IS NULL OR ${table.cancelledAt} IS NULL`,
    ),
    check(
      'recruitment_valid_unit',
      sql`(${table.buildingCode}='barracks' AND ${table.unitCode} IN ('spear','sword','axe','archer')) OR (${table.buildingCode}='stable' AND ${table.unitCode} IN ('spy','light','heavy')) OR (${table.buildingCode}='workshop' AND ${table.unitCode} IN ('ram','catapult')) OR (${table.buildingCode}='noble' AND ${table.unitCode}='noble' AND ${table.quantity}=1 AND ${table.population}=100)`,
    ),
  ],
);

export const unitPlacements = pgTable(
  'unit_placements',
  {
    worldId: integer('world_id').notNull(),
    originVillageId: integer('origin_village_id').notNull(),
    locationVillageId: integer('location_village_id').notNull(),
    unitCode: text('unit_code').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.originVillageId, table.locationVillageId, table.unitCode] }),
    foreignKey({
      columns: [table.originVillageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    foreignKey({
      columns: [table.locationVillageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    index('placements_location_idx').on(table.locationVillageId, table.worldId),
    check('placements_nonnegative_quantity', sql`${table.quantity} >= 0`),
    check(
      'placements_valid_unit',
      sql`${table.unitCode} IN ('spear','sword','axe','archer','spy','light','heavy','ram','catapult','noble')`,
    ),
  ],
);

export const coinMintEvents = pgTable(
  'coin_mint_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    playerId: integer('player_id').notNull(),
    villageId: integer('village_id').notNull(),
    requestId: text('request_id').notNull(),
    cost: jsonb('cost').$type<Resources>().notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('coin_mint_request_idx').on(table.playerId, table.requestId),
    index('coin_mint_village_idx').on(table.villageId, table.worldId),
    foreignKey({
      columns: [table.playerId, table.worldId],
      foreignColumns: [players.id, players.worldId],
    }),
    foreignKey({
      columns: [table.villageId, table.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
  ],
);

export const troopOperations = pgTable(
  'troop_operations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    requestId: text('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('troop_operation_request_idx').on(t.villageId, t.requestId),
    foreignKey({
      columns: [t.villageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
  ],
);

export const troopMovements = pgTable(
  'troop_movements',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    originVillageId: integer('origin_village_id').notNull(),
    fromVillageId: integer('from_village_id').notNull(),
    toVillageId: integer('to_village_id').notNull(),
    kind: text('kind').$type<'support' | 'return' | 'attack'>().notNull(),
    ownerPlayerId: integer('owner_player_id').notNull(),
    originLost: boolean('origin_lost').notNull().default(false),
    loot: jsonb('loot').$type<Resources>().notNull().default({ wood: 0, stone: 0, iron: 0 }),
    targetBuilding: text('target_building').$type<import('@dwar/game-config').BuildingCode>(),
    troops: jsonb('troops').$type<Troops>().notNull(),
    startsAt: time('starts_at'),
    endsAt: time('ends_at'),
    arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  },
  (t) => [
    ...[t.originVillageId, t.fromVillageId, t.toVillageId].map((column) =>
      foreignKey({ columns: [column, t.worldId], foreignColumns: [villages.id, villages.worldId] }),
    ),
    foreignKey({
      columns: [t.ownerPlayerId, t.worldId],
      foreignColumns: [players.id, players.worldId],
    }),
    index('troop_movements_pending_idx')
      .on(t.worldId, t.endsAt, t.id)
      .where(sql`${t.arrivedAt} IS NULL`),
    index('troop_movements_origin_idx').on(t.originVillageId, t.worldId),
    check(
      'troop_movement_route',
      sql`${t.fromVillageId} <> ${t.toVillageId} AND ${t.endsAt} > ${t.startsAt} AND (((${t.kind}='support' OR ${t.kind}='attack') AND ${t.originVillageId}=${t.fromVillageId}) OR (${t.kind}='return' AND ${t.originVillageId}=${t.toVillageId}))`,
    ),
  ],
);

export const marketOperations = pgTable(
  'market_operations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    requestId: text('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('market_operation_request_idx').on(t.villageId, t.requestId),
    foreignKey({
      columns: [t.villageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
  ],
);

export const marketOffers = pgTable(
  'market_offers',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    villageId: integer('village_id').notNull(),
    sellResource: text('sell_resource').notNull(),
    buyResource: text('buy_resource').notNull(),
    sellAmount: integer('sell_amount').notNull(),
    buyAmount: integer('buy_amount').notNull(),
    merchants: integer('merchants').notNull(),
    createdAt: time('created_at').defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByVillageId: integer('accepted_by_village_id'),
  },
  (t) => [
    uniqueIndex('offers_id_world_idx').on(t.id, t.worldId),
    foreignKey({
      columns: [t.villageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    foreignKey({
      columns: [t.acceptedByVillageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    index('offers_open_world_idx')
      .on(t.worldId, t.createdAt, t.id)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.cancelledAt} IS NULL`),
    index('offers_village_idx').on(t.villageId, t.worldId),
    check(
      'offer_valid_resources',
      sql`${t.sellResource} IN ('wood','stone','iron') AND ${t.buyResource} IN ('wood','stone','iron')`,
    ),
    check(
      'offer_valid_amounts',
      sql`${t.sellAmount} BETWEEN 1 AND 235000 AND ${t.buyAmount} BETWEEN 1 AND 235000 AND ${t.merchants} = ceil(${t.sellAmount} / 1000.0)`,
    ),
    check(
      'offer_terminal_state',
      sql`(${t.acceptedAt} IS NULL) = (${t.acceptedByVillageId} IS NULL) AND (${t.acceptedAt} IS NULL OR ${t.cancelledAt} IS NULL)`,
    ),
  ],
);

export const tradeShipments = pgTable(
  'trade_shipments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    fromVillageId: integer('from_village_id').notNull(),
    toVillageId: integer('to_village_id').notNull(),
    mode: text('mode').notNull(),
    offerId: integer('offer_id'),
    resources: jsonb('resources').$type<Resources>().notNull(),
    merchants: integer('merchants').notNull(),
    startsAt: time('starts_at'),
    endsAt: time('ends_at'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      columns: [t.fromVillageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    foreignKey({
      columns: [t.toVillageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    foreignKey({
      columns: [t.offerId, t.worldId],
      foreignColumns: [marketOffers.id, marketOffers.worldId],
    }),
    index('shipments_pending_idx')
      .on(t.worldId, t.endsAt, t.id)
      .where(sql`${t.deliveredAt} IS NULL AND ${t.cancelledAt} IS NULL`),
    index('shipments_origin_idx').on(t.fromVillageId, t.worldId),
    index('shipments_destination_idx').on(t.toVillageId, t.worldId),
    check(
      'shipment_valid_route',
      sql`${t.fromVillageId} <> ${t.toVillageId} AND ${t.endsAt} > ${t.startsAt}`,
    ),
    check(
      'shipment_valid_mode',
      sql`(${t.mode}='normal' AND ${t.offerId} IS NULL) OR (${t.mode}='offer' AND ${t.offerId} IS NOT NULL)`,
    ),
    check('shipment_terminal_state', sql`${t.deliveredAt} IS NULL OR ${t.cancelledAt} IS NULL`),
    check(
      'shipment_valid_resources',
      sql`(${t.resources}->>'wood')::integer >= 0 AND (${t.resources}->>'stone')::integer >= 0 AND (${t.resources}->>'iron')::integer >= 0 AND ${t.merchants} > 0 AND ${t.merchants} = ceil(((${t.resources}->>'wood')::numeric + (${t.resources}->>'stone')::numeric + (${t.resources}->>'iron')::numeric)/1000)`,
    ),
  ],
);

export const mailThreads = pgTable(
  'mail_threads',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    senderPlayerId: integer('sender_player_id').notNull(),
    recipientPlayerId: integer('recipient_player_id').notNull(),
    title: text('title').notNull(),
    lastPostAt: time('last_post_at'),
    senderStatus: text('sender_status')
      .$type<'answered' | 'new' | 'read'>()
      .notNull()
      .default('answered'),
    recipientStatus: text('recipient_status')
      .$type<'answered' | 'new' | 'read'>()
      .notNull()
      .default('new'),
    senderDeleted: boolean('sender_deleted').notNull().default(false),
    recipientDeleted: boolean('recipient_deleted').notNull().default(false),
  },
  (t) => [
    uniqueIndex('mail_threads_id_world_idx').on(t.id, t.worldId),
    index('mail_threads_sender_idx').on(t.worldId, t.senderPlayerId, t.lastPostAt),
    index('mail_threads_recipient_idx').on(t.worldId, t.recipientPlayerId, t.lastPostAt),
    ...[t.senderPlayerId, t.recipientPlayerId].map((column) =>
      foreignKey({ columns: [column, t.worldId], foreignColumns: [players.id, players.worldId] }),
    ),
    check('mail_thread_participants', sql`${t.senderPlayerId} <> ${t.recipientPlayerId}`),
    check(
      'mail_thread_status',
      sql`${t.senderStatus} IN ('answered','new','read') AND ${t.recipientStatus} IN ('answered','new','read')`,
    ),
    check('mail_thread_title', sql`char_length(${t.title}) BETWEEN 3 AND 120`),
  ],
);
export const mailPosts = pgTable(
  'mail_posts',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    threadId: integer('thread_id').notNull(),
    authorPlayerId: integer('author_player_id').notNull(),
    text: text('text').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.threadId, t.worldId],
      foreignColumns: [mailThreads.id, mailThreads.worldId],
    }),
    foreignKey({
      columns: [t.authorPlayerId, t.worldId],
      foreignColumns: [players.id, players.worldId],
    }),
    index('mail_posts_thread_idx').on(t.threadId, t.createdAt, t.id),
    check('mail_post_text', sql`char_length(${t.text}) BETWEEN 3 AND 16000`),
  ],
);
export const mailBlocks = pgTable(
  'mail_blocks',
  {
    worldId: integer('world_id').notNull(),
    blockerPlayerId: integer('blocker_player_id').notNull(),
    blockedPlayerId: integer('blocked_player_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerPlayerId, t.blockedPlayerId] }),
    ...[t.blockerPlayerId, t.blockedPlayerId].map((column) =>
      foreignKey({ columns: [column, t.worldId], foreignColumns: [players.id, players.worldId] }),
    ),
    check('mail_block_not_self', sql`${t.blockerPlayerId} <> ${t.blockedPlayerId}`),
  ],
);
export const mailOperations = pgTable(
  'mail_operations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    playerId: integer('player_id').notNull(),
    requestId: text('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    resultThreadId: integer('result_thread_id'),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('mail_operations_request_idx').on(t.playerId, t.requestId),
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    foreignKey({
      columns: [t.resultThreadId, t.worldId],
      foreignColumns: [mailThreads.id, mailThreads.worldId],
    }),
  ],
);

export const mapPreferences = pgTable('map_preferences', {
  playerId: integer('player_id')
    .primaryKey()
    .references(() => players.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').$type<MapSettings>().notNull(),
});
export const mapMarks = pgTable(
  'map_marks',
  {
    worldId: integer('world_id').notNull(),
    playerId: integer('player_id').notNull(),
    targetPlayerId: integer('target_player_id').notNull(),
    color: text('color').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.targetPlayerId] }),
    ...[t.playerId, t.targetPlayerId].map((column) =>
      foreignKey({
        columns: [column, t.worldId],
        foreignColumns: [players.id, players.worldId],
      }).onDelete('cascade'),
    ),
    check('map_marks_other_player', sql`${t.playerId} <> ${t.targetPlayerId}`),
    check('map_marks_hex_color', sql`${t.color} ~ '^#[0-9a-fA-F]{6}$'`),
  ],
);

export const identifierAliases = pgTable(
  'identifier_aliases',
  {
    entity: text('entity').notNull(),
    previousId: text('previous_id').notNull(),
    id: integer('id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entity, t.previousId] }),
    uniqueIndex('identifier_aliases_entity_id_key').on(t.entity, t.id),
    check('identifier_aliases_id_check', sql`${t.id} > 0`),
  ],
);

export const battleReports = pgTable(
  'battle_reports',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    movementId: integer('movement_id')
      .notNull()
      .unique()
      .references(() => troopMovements.id),
    fromVillageId: integer('from_village_id').notNull(),
    toVillageId: integer('to_village_id').notNull(),
    occurredAt: time('occurred_at'),
    result: jsonb('result').$type<BattleRecord>().notNull(),
  },
  (t) => [
    uniqueIndex('battle_reports_id_world_key').on(t.id, t.worldId),
    ...[t.fromVillageId, t.toVillageId].map((c) =>
      foreignKey({ columns: [c, t.worldId], foreignColumns: [villages.id, villages.worldId] }),
    ),
    index('battle_reports_world_time_idx').on(t.worldId, t.occurredAt, t.id),
  ],
);
export const battleReportRecipients = pgTable(
  'battle_report_recipients',
  {
    worldId: integer('world_id').notNull(),
    reportId: integer('report_id').notNull(),
    playerId: integer('player_id').notNull(),
    role: text('role').$type<'attacker' | 'defender' | 'support'>().notNull(),
    supportTroops: jsonb('support_troops').$type<Troops>(),
    supportLosses: jsonb('support_losses').$type<Troops>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.reportId, t.playerId] }),
    foreignKey({
      columns: [t.reportId, t.worldId],
      foreignColumns: [battleReports.id, battleReports.worldId],
    }),
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    index('battle_report_recipients_player_idx').on(t.playerId, t.worldId),
  ],
);

/** Notas pessoais com BBCode: uma geral (village_id nulo) e uma por aldeia. */
export const playerNotes = pgTable(
  'player_notes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    playerId: integer('player_id').notNull(),
    villageId: integer('village_id'),
    body: text('body').notNull(),
    updatedAt: time('updated_at').defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    foreignKey({
      columns: [t.villageId, t.worldId],
      foreignColumns: [villages.id, villages.worldId],
    }),
    uniqueIndex('player_notes_general_idx')
      .on(t.playerId)
      .where(sql`${t.villageId} IS NULL`),
    uniqueIndex('player_notes_village_idx')
      .on(t.playerId, t.villageId)
      .where(sql`${t.villageId} IS NOT NULL`),
  ],
);

/** Tribos: nome e tag únicos por mundo, texto público e texto só para os membros. */
export const tribes = pgTable(
  'tribes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    description: text('description').notNull().default(''),
    internalText: text('internal_text').notNull().default(''),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('tribes_id_world_idx').on(t.id, t.worldId),
    uniqueIndex('tribes_name_idx').on(t.worldId, sql`lower(${t.name})`),
    uniqueIndex('tribes_tag_idx').on(t.worldId, sql`lower(${t.tag})`),
  ],
);

/** Um jogador pertence a no máximo uma tribo; a chave é o jogador. */
export const tribeMembers = pgTable(
  'tribe_members',
  {
    playerId: integer('player_id').primaryKey(),
    worldId: integer('world_id').notNull(),
    tribeId: integer('tribe_id').notNull(),
    title: text('title').notNull().default(''),
    isFounder: boolean('is_founder').notNull().default(false),
    canLead: boolean('can_lead').notNull().default(false),
    canInvite: boolean('can_invite').notNull().default(false),
    canDiplomacy: boolean('can_diplomacy').notNull().default(false),
    canMassMail: boolean('can_mass_mail').notNull().default(false),
    canModerate: boolean('can_moderate').notNull().default(false),
    canHiddenForum: boolean('can_hidden_forum').notNull().default(false),
    joinedAt: time('joined_at').defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    foreignKey({
      columns: [t.tribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    index('tribe_members_tribe_idx').on(t.tribeId),
  ],
);

export const tribeInvites = pgTable(
  'tribe_invites',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    tribeId: integer('tribe_id').notNull(),
    playerId: integer('player_id').notNull(),
    invitedBy: integer('invited_by').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    foreignKey({
      columns: [t.invitedBy, t.worldId],
      foreignColumns: [players.id, players.worldId],
    }),
    uniqueIndex('tribe_invites_tribe_id_player_id_unique').on(t.tribeId, t.playerId),
    index('tribe_invites_player_idx').on(t.playerId),
  ],
);

/** Relação declarada por uma tribo com outra (aliada, pacto de não agressão ou inimiga). */
export const tribeRelations = pgTable(
  'tribe_relations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    fromTribeId: integer('from_tribe_id').notNull(),
    toTribeId: integer('to_tribe_id').notNull(),
    kind: text('kind').$type<'ally' | 'nap' | 'enemy'>().notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.fromTribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.toTribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    uniqueIndex('tribe_relations_from_tribe_id_to_tribe_id_unique').on(t.fromTribeId, t.toTribeId),
    index('tribe_relations_to_idx').on(t.toTribeId),
  ],
);

/** Guerra formal entre duas tribos, com título, declaração e (quando acaba) a data de fim. */
export const tribeWars = pgTable(
  'tribe_wars',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    declarerTribeId: integer('declarer_tribe_id').notNull(),
    targetTribeId: integer('target_tribe_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    declaredAt: time('declared_at').defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      columns: [t.declarerTribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.targetTribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    index('tribe_wars_declarer_idx').on(t.declarerTribeId),
    index('tribe_wars_target_idx').on(t.targetTribeId),
  ],
);

/** Pedido de paz em aberto de uma guerra (no máximo um por guerra). */
export const tribePeaceOffers = pgTable('tribe_peace_offers', {
  warId: integer('war_id')
    .primaryKey()
    .references(() => tribeWars.id, { onDelete: 'cascade' }),
  offeredByTribeId: integer('offered_by_tribe_id').notNull(),
  createdAt: time('created_at').defaultNow(),
});

/** Registro de eventos da tribo; a mensagem usa BBCode ([player]Nome[/player]). */
export const tribeEvents = pgTable(
  'tribe_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id').notNull(),
    tribeId: integer('tribe_id').notNull(),
    message: text('message').notNull(),
    createdAt: time('created_at').defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tribeId, t.worldId],
      foreignColumns: [tribes.id, tribes.worldId],
    }).onDelete('cascade'),
    index('tribe_events_recent_idx').on(t.tribeId, t.createdAt, t.id),
  ],
);

/** Último nível conhecido de cada medalha de cada jogador (para avisar só quando sobe). */
export const playerMedals = pgTable(
  'player_medals',
  {
    playerId: integer('player_id').notNull(),
    worldId: integer('world_id').notNull(),
    code: text('code').notNull(),
    stage: integer('stage').notNull().default(0),
    updatedAt: time('updated_at').defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.code] }),
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
  ],
);

/** Relatórios de comércio, de chegada de apoio e de medalhas, um por destinatário. */
export const noticeReports = pgTable(
  'notice_reports',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id),
    playerId: integer('player_id').notNull(),
    kind: text('kind').$type<'trade' | 'support' | 'medal' | 'tribe'>().notNull(),
    occurredAt: time('occurred_at'),
    fromVillageId: integer('from_village_id'),
    toVillageId: integer('to_village_id'),
    payload: jsonb('payload').$type<NoticePayload>().notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    foreignKey({ columns: [t.playerId, t.worldId], foreignColumns: [players.id, players.worldId] }),
    ...[t.fromVillageId, t.toVillageId].map((c) =>
      foreignKey({ columns: [c, t.worldId], foreignColumns: [villages.id, villages.worldId] }),
    ),
    index('notice_reports_visible_idx').on(t.playerId, t.worldId, t.occurredAt, t.id),
  ],
);

/** Estado do posicionamento em espiral das aldeias, por mundo, fluxo e quadrante. */
export const worldPlacement = pgTable(
  'world_placement',
  {
    worldId: integer('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    stream: text('stream').$type<'player' | 'barbarian'>().notNull(),
    quadrant: text('quadrant').$type<'nw' | 'ne' | 'se' | 'sw'>().notNull(),
    count: integer('count').notNull().default(0),
    ring: integer('ring').notNull().default(1),
    alpha: integer('alpha').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.worldId, table.stream, table.quadrant] })],
);
