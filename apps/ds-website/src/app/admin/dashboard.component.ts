import { Component, OnInit, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MemberService, AuthService } from '@ds/web/data-access';
import { Member } from '@ds/shared/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, FormsModule],
  template: `
    <div class="min-h-screen bg-base-100/50 backdrop-blur-xl flex flex-col pt-20 px-4 md:px-8 pb-10">
      <!-- Header Section -->
      <div class="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="font-heading text-4xl text-primary tracking-tighter flex items-center gap-3 text-glow-gold">
            CLAN COMMAND CENTER
            <!-- Badge -->
            <span class="bg-primary/10 text-primary text-xs font-sans font-bold px-2 py-1 rounded-full border border-primary/20">
              ADMIN v2.0
            </span>
          </h1>
          <p class="text-base-content/60 font-medium">Thay thế quản lý Google Sheets bằng hệ thống DarkStar Premium.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="memberService.loadMembers()" class="btn btn-ghost btn-sm gap-2">
            <span class="loading loading-spinner loading-xs" *ngIf="memberService.isLoading()"></span>
            RELOAD DATA
          </button>
          <button class="btn btn-primary btn-sm glow-border-gold gap-2">
            + NEW MEMBER
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-base-200/50 border border-white/5 p-6 rounded-2xl flex flex-col">
          <span class="text-xs font-bold text-primary tracking-widest uppercase opacity-70">TOTAL MEMBERS</span>
          <span class="text-3xl font-heading mt-2">{{ memberService.members().length }}</span>
        </div>
        <div class="bg-base-200/50 border border-white/5 p-6 rounded-2xl flex flex-col">
          <span class="text-xs font-bold text-primary tracking-widest uppercase opacity-70">TOTAL POINTS</span>
          <span class="text-3xl font-heading mt-2">{{ totalPoints() }}</span>
        </div>
        <div class="bg-base-200/50 border border-white/5 p-6 rounded-2xl flex flex-col">
          <span class="text-xs font-bold text-primary tracking-widest uppercase opacity-70">ACTIVE SEASONS</span>
          <span class="text-3xl font-heading mt-2">S13: RISE</span>
        </div>
        <div class="bg-base-200/50 border border-white/5 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all">
          <span class="text-xs font-bold text-primary tracking-widest uppercase opacity-70">COMMANDER</span>
          <span class="text-3xl font-heading mt-2 text-glow-gold">{{ auth.user()?.username || 'ADMIN' }}</span>
          <!-- Subtle mascot hint -->
          <div class="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <img ngSrc="https://static.miraheze.org/grandsummonerswiki/thumb/e/e6/Unit_Liza_6_Star_Icon.png/120px-Unit_Liza_6_Star_Icon.png" width="80" height="80" alt="Liza Mascot">
          </div>
        </div>
      </div>

      <!-- Member Table (Replaces Sheet) -->
      <div class="max-w-7xl mx-auto w-full bg-base-200/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
        <div class="overflow-x-auto">
          <table class="table table-lg">
            <thead class="bg-white/5">
              <tr class="text-primary font-heading tracking-widest border-b border-white/5 uppercase opacity-80">
                <th>MEMBER</th>
                <th>GS CODE</th>
                <th>RANK</th>
                <th>POINTS</th>
                <th>COUNTRY</th>
                <th>STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let member of memberService.members()" class="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar">
                      <div class="mask mask-squircle w-10 h-10 border border-primary/20">
                        <img [src]="member.avatarUrl" [alt]="member.nickname" />
                      </div>
                    </div>
                    <div>
                      <div class="font-bold text-secondary">{{ member.nickname }}</div>
                      <div class="text-xs opacity-50">{{ member.ign }}</div>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-sm opacity-60">{{ member.gsCode || 'N/A' }}</td>
                <td class="font-heading">#{{ member.id === '1' ? 1 : member.id === '2' ? 2 : '-' }}</td>
                <td>
                  <div class="flex flex-col">
                    <span class="font-bold text-primary text-glow-gold">{{ member.points }}</span>
                    <span class="text-[10px] opacity-40 uppercase tracking-tighter">Current Balance</span>
                  </div>
                </td>
                <td>{{ member.id === '1' ? '🇻🇳' : '🌍' }}</td>
                <td>
                  <span [class]="getStatusClass('ACTIVE')" class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border">
                    ACTIVE
                  </span>
                </td>
                <th class="text-right">
                  <div class="flex justify-end gap-2">
                    <button class="btn btn-ghost btn-xs text-primary/70 hover:text-primary">EDIT</button>
                    <button (click)="openPointUpdate(member)" class="btn btn-ghost btn-xs text-glow-gold">+ POINTS</button>
                  </div>
                </th>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty State -->
        <div *ngIf="memberService.members().length === 0 && !memberService.isLoading()" class="p-20 flex flex-col items-center justify-center text-center opacity-50">
          <img ngSrc="https://static.miraheze.org/grandsummonerswiki/thumb/e/e6/Unit_Liza_6_Star_Icon.png/120px-Unit_Liza_6_Star_Icon.png" width="100" height="100" alt="Liza" class="grayscale mb-4">
          <p class="font-heading text-2xl">NO CLAN DATA FOUND</p>
          <p class="text-sm">Hãy thử nạp lại dữ liệu hoặc kiểm tra kết nối Database.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .btn-ghost:hover { background: oklch(100% 0 0 / 0.05); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  memberService = inject(MemberService);
  auth = inject(AuthService);

  totalPoints = computed(() => 
    this.memberService.members().reduce((acc: number, current: Member) => acc + (current.points || 0), 0)
  );

  ngOnInit() {
    this.memberService.loadMembers();
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'ACTIVE': return 'bg-success/10 text-success border-success/20';
      case 'FORMER': return 'bg-error/10 text-error border-error/20';
      case 'MODERATOR': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-base-300 text-base-content/50 border-white/5';
    }
  }

  openPointUpdate(member: Member) {
    // Logic for dialog will go here
    console.log('Update points for', member.nickname);
  }
}
