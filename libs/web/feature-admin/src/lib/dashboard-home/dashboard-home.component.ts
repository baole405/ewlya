import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Activity, Users, Trophy, Star } from 'lucide-angular';

@Component({
  selector: 'ds-dashboard-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 class="text-3xl font-black">Chế độ Quản trị</h1>
        <p class="text-base-content/60">Chào mừng trở lại, Clan Admin.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stats shadow bg-base-100 overflow-hidden group">
          <div class="stat">
            <div class="stat-figure text-primary">
              <lucide-angular
                [name]="Users"
                class="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity"
              ></lucide-angular>
            </div>
            <div class="stat-title text-xs font-bold uppercase tracking-wider">Tổng Member</div>
            <div class="stat-value text-primary">--</div>
            <div class="stat-desc font-medium">Đang đồng bộ...</div>
          </div>
        </div>

        <div class="stats shadow bg-base-100 overflow-hidden group">
          <div class="stat">
            <div class="stat-figure text-secondary">
              <lucide-angular
                [name]="Trophy"
                class="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity"
              ></lucide-angular>
            </div>
            <div class="stat-title text-xs font-bold uppercase tracking-wider">
              Mùa giải hiện tại
            </div>
            <div class="stat-value text-secondary">--</div>
            <div class="stat-desc font-medium">SS01: Origin</div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl border border-base-200">
        <div class="card-body p-0">
          <div class="p-6 border-b border-base-200 flex items-center justify-between">
            <h2 class="card-title flex items-center gap-2">
              <lucide-angular [name]="Activity" class="w-5 h-5 text-primary"></lucide-angular>
              Hoạt động gần đây
            </h2>
          </div>
          <div class="h-64 flex flex-col items-center justify-center text-base-content/30 gap-3">
            <lucide-angular [name]="Star" class="w-12 h-12 animate-pulse"></lucide-angular>
            <p class="font-medium italic">Đang tải dữ liệu thời gian thực...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DashboardHomeComponent {
  readonly Activity = Activity;
  readonly Users = Users;
  readonly Trophy = Trophy;
  readonly Star = Star;
}
