export interface Member {
  id: string;
  nickname: string;
  ign: string;
  discordId: string;
  gsCode: string;
  points: number;
  rank: number;
  avatarUrl?: string;
}

export interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'archived';
}
