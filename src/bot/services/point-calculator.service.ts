export const POINT_CONFIG = {
  CRESTS: {
    label: '💎 Crests',
    options: [
      { id: '4plus', label: '4+', points: 8 },
      { id: 'burst', label: 'Burst', points: 20 },
      { id: 'zero', label: '0', points: 0 },
    ],
  },
  LB_SPEX: {
    label: '🏆 Leaderboards (Spex or Higher Difficulty / Ruins 6-16F)',
    options: [
      { id: 'spex_1st', label: '1st Place', points: 24 },
      { id: 'spex_2_3', label: '2nd - 3rd Place', points: 12 },
      { id: 'spex_4_8', label: '4th - 8th Place', points: 6 },
      { id: 'spex_9_10', label: '9th - 10th Place (Not Counted)', points: 0 },
    ],
  },
  LB_EX: {
    label: '🏆 Leaderboards (EX2 & Lower)',
    options: [
      { id: 'ex_1st', label: '1st Place', points: 12 },
      { id: 'ex_2_3', label: '2nd - 3rd Place', points: 6 },
      { id: 'ex_4_8', label: '4th - 8th Place', points: 3 },
      { id: 'ex_9_10', label: '9th - 10th Place (Not Counted)', points: 0 },
    ],
  },
  LB_BLUE: {
    label: '🏆 Leaderboards (Blue Stage / Ruins 1-5F)',
    options: [
      { id: 'blue_1st', label: '1st Place', points: 5 },
      { id: 'blue_2nd', label: '2nd Place', points: 4 },
      { id: 'blue_3rd', label: '3rd Place', points: 3 },
      { id: 'blue_4th', label: '4th Place', points: 2 },
      { id: 'blue_5th', label: '5th Place', points: 1 },
      { id: 'blue_6_10', label: '6th - 10th Place (Not Counted)', points: 0 },
    ],
  },
  LB_SUMMONER_ROAD: {
    label: '🏆 Leaderboards (Summoner Road)',
    options: [
      { id: 'sum_1st', label: '1st Place', points: 120 },
      { id: 'sum_2_3', label: '2nd - 3rd Place', points: 60 },
      { id: 'sum_4_8', label: '4th - 8th Place', points: 30 },
    ],
  },
  MINES: {
    label: '⛏️ Mines',
    options: [
      { id: 'b200f', label: 'B200F', points: 10 },
      { id: 'b250f', label: 'B250F', points: 20 },
      { id: 'b300f', label: 'B300F', points: 30 },
      { id: 'b350f', label: 'B350F', points: 80 },
      { id: 'b400f', label: 'B400F', points: 150 },
      { id: 'b450f', label: 'B450F', points: 200 },
      { id: 'b500f', label: 'B500F', points: 300 },
      { id: 'b550f', label: 'B550F', points: 350 },
      { id: 'b600f', label: 'B600F', points: 400 },
    ],
  },
  RAIDS: {
    label: '⚔️ Raids',
    options: [
      { id: 'raid_1_3', label: 'Top 1 - 3', points: 100 },
      { id: 'raid_4_10', label: 'Top 4 - 10', points: 75 },
      { id: 'raid_11_30', label: 'Top 11 - 30', points: 50 },
      { id: 'raid_31_50', label: 'Top 31 - 50', points: 10 },
      { id: 'raid_100', label: 'Top 100', points: 3 },
    ],
  },
  CHALLENGES: {
    label: '🎯 Challenges',
    options: [
      { id: 'chal_max', label: 'Maximum', points: 20 },
      { id: 'chal_min', label: 'Minimum', points: 5 },
    ],
  },
  SR_EQ: {
    label: "🛠️ SR's EQ",
    options: [
      { id: 'eq_rep', label: 'Rep', points: 5 },
      { id: 'eq_custom', label: 'Custom', points: 20 },
      { id: 'eq_zero', label: '0', points: 0 },
    ],
  },
};

export type CategoryKey = keyof typeof POINT_CONFIG;

export function getOptionById(categoryKey: CategoryKey, optionId: string) {
  return POINT_CONFIG[categoryKey]?.options.find((o) => o.id === optionId);
}

