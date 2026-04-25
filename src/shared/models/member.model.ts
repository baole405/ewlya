export interface Member {
  id: string;
  nickname: string;
  ign: string;
  discordId: string | null;
  gsCode: string | null;
  points: number;
  rank?: number;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'MEMBER';

  // Domain fields
  gender?: string | null;
  birthdate?: string | null;
  age?: string | null;
  country?: string | null;
  aka?: string | null;

  status: 'OFFICIAL' | 'TRIAL' | 'FORMER' | 'BANNED' | string;
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
