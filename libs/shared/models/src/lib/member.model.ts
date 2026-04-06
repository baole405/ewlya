export interface Member {
  id: string;
  nickname: string;
  ign: string;
  discordId: string;
  gsCode: string;
  points: number;
  rank: number;
  avatarUrl?: string;
  role: 'ADMIN' | 'MEMBER';

  // Domain fields from user
  gender?: string;
  birthdate?: Date;
  age?: number;
  country?: string;
  aka?: string;

  status: 'ACTIVE' | 'FORMER';
  createdAt: Date;
  updatedAt: Date;
}

export interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'archived';
}
