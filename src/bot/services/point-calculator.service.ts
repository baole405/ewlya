export const POINT_CONFIG = {
  CRESTS: {
    label: 'Crests',
    options: [
      { id: '4plus', label: '4 plus', points: 8 },
      { id: 'burst', label: 'crest burst', points: 20 },
    ],
  },
  LB_EX: {
    label: 'Leaderboards (EX2, EX1, EX, Ruins)',
    options: [
      { id: 'ex_1st', label: '1st Place', points: 12 },
      { id: 'ex_2_3', label: '2nd - 3rd Place', points: 6 },
      { id: 'ex_4_8', label: '4th - 8th Place', points: 3 },
    ],
  },
  LB_BLUE: {
    label: 'Leaderboards (Blue Stage / No Prefix)',
    options: [
      { id: 'blue_1st', label: '1st Place', points: 5 },
      { id: 'blue_2nd', label: '2nd Place', points: 4 },
      { id: 'blue_3rd', label: '3rd Place', points: 3 },
      { id: 'blue_4th', label: '4th Place', points: 2 },
      { id: 'blue_5th', label: '5th Place', points: 1 },
    ],
  },
};

export type CategoryKey = keyof typeof POINT_CONFIG;

export function getOptionById(categoryKey: CategoryKey, optionId: string) {
  return POINT_CONFIG[categoryKey].options.find((o) => o.id === optionId);
}

