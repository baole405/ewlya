export const POINT_CONFIG = {
  CRESTS: {
    label: '💎 Crests',
    options: [
      { id: '4plus', label: '4+', points: 8 },
      { id: 'burst', label: 'Burst', points: 20 },
    ],
  },
  LB_SPEX: {
    label: '🏆 Leaderboards (Spex and up)',
    options: [
      { id: 'spex_1st', label: '1st Place', points: 24 },
      { id: 'spex_2_3', label: '2nd - 3rd Place', points: 12 },
      { id: 'spex_4_8', label: '4th - 8th Place', points: 6 },
    ],
  },
  LB_EX: {
    label: '🏆 Leaderboards (EX2, EX1, EX, Ruins 1-5)',
    options: [
      { id: 'ex_1st', label: '1st Place', points: 12 },
      { id: 'ex_2_3', label: '2nd - 3rd Place', points: 6 },
      { id: 'ex_4_8', label: '4th - 8th Place', points: 3 },
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
  SR_EQ: {
    label: "🛠️ SR's EQ",
    options: [
      { id: 'eq_rep', label: 'Rep', points: 5 },
      { id: 'eq_custom', label: 'Custom', points: 20 },
    ],
  },
  LB_BLUE: {
    label: '🏆 Leaderboards (Blue Stage / No Prefix)',
    options: [
      { id: 'blue_1st', label: '1st Place', points: 5 },
      { id: 'blue_2nd', label: '2nd Place', points: 4 },
      { id: 'blue_3rd', label: '3rd Place', points: 3 },
      { id: 'blue_4th', label: '4th Place', points: 2 },
      { id: 'blue_5th', label: '5th Place', points: 1 },
      { id: 'blue_6_10', label: '6th - 10th Place', points: 0 },
    ],
  },
};

export type CategoryKey = keyof typeof POINT_CONFIG;

export function getOptionById(categoryKey: CategoryKey, optionId: string) {
  return POINT_CONFIG[categoryKey].options.find((o) => o.id === optionId);
}

