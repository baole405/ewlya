import { Injectable, PLATFORM_ID, computed, inject, resource } from '@angular/core';
import { Member } from '@ds/shared/models';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private platformId = inject(PLATFORM_ID);

  // Mock data as fallback for client-side or if DB is empty
  private mockMembers: Member[] = [
    {
      id: '1',
      nickname: 'Grimex',
      ign: 'Grimex GS',
      discordId: '123456789',
      gsCode: 'GS-1234',
      points: 2500,
      rank: 1,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grimex',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
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
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
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
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
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
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Resource for fetching members (Prisma only on server)
  private membersResource = resource({
    loader: async () => {
      return this.mockMembers;
    },
  });

  members = computed(() => this.membersResource.value() ?? this.mockMembers);

  getTop3() {
    return this.members().slice(0, 3);
  }
}
