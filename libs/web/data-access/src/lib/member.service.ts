import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, resource } from '@angular/core';
import { prisma } from '@ds/db';
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
  ];

  // Resource for fetching members (Prisma only on server)
  private membersResource = resource({
    loader: async () => {
      if (isPlatformServer(this.platformId)) {
        try {
          const dbMembers = await prisma.member.findMany({
            orderBy: { points: 'desc' },
          });

          if (dbMembers.length > 0) {
            return dbMembers as unknown as Member[];
          }
        } catch (error) {
          console.error('Error fetching members from Prisma:', error);
        }
      }
      return this.mockMembers;
    },
  });

  members = computed(() => this.membersResource.value() ?? this.mockMembers);

  getTop3() {
    return this.members().slice(0, 3);
  }
}
