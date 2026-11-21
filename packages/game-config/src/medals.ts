/**
 * Medalhas, no estilo do Speed Wars: cada uma tem 4 níveis (Madeira, Bronze, Prata e Ouro). A maioria
 * conta algo (basta chegar ao valor); a de posição no ranking vale quando o jogador está
 * na posição indicada ou melhor. Medalhas de sistemas que o jogo ainda não tem (amizades, tribo,
 * aldeias reservadas, ouro e auto-ataque) entram quando esses sistemas existirem.
 */
export const medalTiers = ['Madeira', 'Bronze', 'Prata', 'Ouro'] as const;

export type MedalCode =
  | 'points'
  | 'rank'
  | 'loot'
  | 'raids'
  | 'conquests'
  | 'kills'
  | 'support_losses'
  | 'trades'
  | 'attacks'
  | 'demolisher'
  | 'wallbreaker'
  | 'noble_slayer'
  | 'victories'
  | 'reinforcements'
  | 'scout_defense';

export type MedalDefinition = {
  code: MedalCode;
  name: string;
  description: string;
  /** 'count': vale ao atingir o valor; 'rank': vale ao estar na posição ou melhor. */
  kind: 'count' | 'rank';
  /** Valores dos níveis 1 a 4. */
  needs: readonly [number, number, number, number];
  /** Frase do objetivo do próximo nível; `{n}` é o valor. */
  goal: string;
  /** Frase de quando já tem o nível; `{n}` é o valor do nível atual. */
  reached: string;
  /** Medida mostrada no progresso. */
  unit: string;
};

export const medals: readonly MedalDefinition[] = [
  {
    code: 'points',
    name: 'Campeão de pontuação',
    description: 'Atinja uma certa pontuação somando todas as suas aldeias.',
    kind: 'count',
    needs: [100, 5000, 100000, 10000000],
    goal: 'Chegue a {n} pontos',
    reached: 'Você já chegou a {n} pontos',
    unit: 'pontos',
  },
  {
    code: 'rank',
    name: 'Líder em pontos',
    description: 'Chegue a uma posição alta no ranking geral do mundo.',
    kind: 'rank',
    needs: [1000, 100, 20, 1],
    goal: 'Chegue ao top {n} do mundo',
    reached: 'Você chegou ao top {n} do mundo',
    unit: 'posição',
  },
  {
    code: 'loot',
    name: 'Ladrão',
    description: 'Saqueie uma certa quantidade de recursos.',
    kind: 'count',
    needs: [500, 10000, 100000, 1000000],
    goal: 'Saqueie {n} recursos',
    reached: 'Você já saqueou {n} recursos',
    unit: 'recursos',
  },
  {
    code: 'raids',
    name: 'Saqueador',
    description: 'Faça ataques que voltem com saque.',
    kind: 'count',
    needs: [10, 100, 1000, 10000],
    goal: 'Saqueie {n} aldeias',
    reached: 'Você já saqueou {n} aldeias',
    unit: 'saques',
  },
  {
    code: 'conquests',
    name: 'Conquista',
    description: 'Conquiste aldeias com nobres.',
    kind: 'count',
    needs: [5, 50, 500, 1000],
    goal: 'Conquiste {n} aldeias',
    reached: 'Você já conquistou {n} aldeias',
    unit: 'conquistas',
  },
  {
    code: 'kills',
    name: 'Líder',
    description: 'Derrote unidades inimigas, atacando ou defendendo.',
    kind: 'count',
    needs: [10000, 100000, 1000000, 20000000],
    goal: 'Destrua {n} unidades inimigas',
    reached: 'Você já destruiu {n} unidades inimigas',
    unit: 'unidades',
  },
  {
    code: 'support_losses',
    name: 'Morte de um herói',
    description: 'Perca unidades que você enviou como apoio a outros jogadores.',
    kind: 'count',
    needs: [100, 1000, 10000, 100000],
    goal: 'Perca {n} unidades apoiando outros jogadores',
    reached: 'Você já perdeu {n} unidades apoiando outros jogadores',
    unit: 'unidades',
  },
  {
    code: 'trades',
    name: 'Mercador',
    description: 'Envie remessas de recursos pelo mercado.',
    kind: 'count',
    needs: [10, 100, 500, 1000],
    goal: 'Entregue {n} remessas pelo mercado',
    reached: 'Você já entregou {n} remessas pelo mercado',
    unit: 'remessas',
  },
  {
    code: 'attacks',
    name: 'Comandante de guerra',
    description: 'Ataque aldeias de outros jogadores.',
    kind: 'count',
    needs: [10, 25, 100, 200],
    goal: 'Ataque {n} vezes aldeias de outros jogadores',
    reached: 'Você já atacou {n} vezes aldeias de outros jogadores',
    unit: 'ataques',
  },
  {
    code: 'demolisher',
    name: 'Vândalo',
    description: 'Destrua níveis de edifícios com catapultas.',
    kind: 'count',
    needs: [25, 250, 2500, 10000],
    goal: 'Destrua {n} níveis de edifícios',
    reached: 'Você já destruiu {n} níveis de edifícios',
    unit: 'níveis',
  },
  {
    code: 'wallbreaker',
    name: 'Quebra-parede',
    description: 'Derrube níveis de muralha com aríetes.',
    kind: 'count',
    needs: [25, 250, 2500, 10000],
    goal: 'Destrua {n} níveis de muralha',
    reached: 'Você já destruiu {n} níveis de muralha',
    unit: 'níveis',
  },
  {
    code: 'noble_slayer',
    name: 'Fé da nobreza',
    description: 'Derrote nobres em batalha, atacando ou defendendo.',
    kind: 'count',
    needs: [15, 100, 350, 700],
    goal: 'Derrote {n} nobres',
    reached: 'Você já derrotou {n} nobres',
    unit: 'nobres',
  },
  {
    code: 'victories',
    name: 'Mestre do campo de batalha',
    description: 'Vença batalhas contra exércitos de pelo menos 50 unidades.',
    kind: 'count',
    needs: [25, 250, 1500, 2500],
    goal: 'Vença {n} batalhas contra exércitos de 50 unidades ou mais',
    reached: 'Você já venceu {n} batalhas contra exércitos de 50 unidades ou mais',
    unit: 'vitórias',
  },
  {
    code: 'reinforcements',
    name: 'Reforços',
    description: 'Participe de batalhas com tropas de apoio.',
    kind: 'count',
    needs: [50, 100, 500, 3000],
    goal: 'Apoie outros jogadores em {n} batalhas',
    reached: 'Você já apoiou outros jogadores em {n} batalhas',
    unit: 'batalhas',
  },
  {
    code: 'scout_defense',
    name: 'Explorador',
    description: 'Repelir ataques de espionagem à sua aldeia.',
    kind: 'count',
    needs: [25, 50, 250, 500],
    goal: 'Repila {n} ataques de espionagem',
    reached: 'Você já repeliu {n} ataques de espionagem',
    unit: 'espionagens',
  },
];

export const medalCodes = medals.map((medal) => medal.code);

/**
 * Nível (0 a 4) que um valor alcança. Nas medalhas de posição, o valor é a posição no ranking
 * (quanto menor, melhor) e 0 significa "sem posição".
 */
export function medalStage(medal: MedalDefinition, value: number): number {
  if (medal.kind === 'rank')
    return value > 0 ? medal.needs.filter((need) => value <= need).length : 0;
  return medal.needs.filter((need) => value >= need).length;
}
