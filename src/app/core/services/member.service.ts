import { Injectable, signal } from '@angular/core';
import { Member } from '../models/member.model';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  // Use Angular Signals for state management
  private membersSignal = signal<Member[]>([
    {
      id: '1',
      nickname: 'Grimex',
      ign: 'Grimex GS',
      discordId: '123456789',
      gsCode: 'GS-1234',
      points: 2500,
      rank: 1,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grimex',
    },
    {
      id: '2',
      nickname: 'Bahan',
      ign: 'Bahan DS',
      discordId: '987654321',
      gsCode: 'GS-5678',
      points: 2450,
      rank: 2,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bahan',
    },
    {
      id: '3',
      nickname: 'DarkStar_Fan',
      ign: 'DS_Fan',
      discordId: '555555555',
      gsCode: 'GS-9999',
      points: 1800,
      rank: 3,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fan',
    },
    {
      id: '4',
      nickname: 'Noctis',
      ign: 'NoctisGS',
      discordId: '111222333',
      gsCode: 'GS-8888',
      points: 1200,
      rank: 4,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Noctis',
    },
  ]);

  // Expose the signal as a read-only computed or just the signal itself
  members = this.membersSignal.asReadonly();

  constructor() {}

  getTop3() {
    return this.membersSignal().slice(0, 3);
  }
}
