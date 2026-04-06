import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Trophy, Plus, Calendar, CheckCircle2, Archive } from 'lucide-angular';

@Component({
  selector: 'ds-season-manager',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-secondary">Quản lý Mùa giải</h1>
          <p class="text-base-content/60">Quản lý các đợt thi đua và tích lũy điểm trong Clan.</p>
        </div>
        <button class="btn btn-secondary shadow-lg shadow-secondary/20 rounded-xl">
          <lucide-angular [name]="Plus" class="w-4 h-4 mr-2"></lucide-angular>
          Mùa giải mới
        </button>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card bg-base-100 shadow-xl border-l-4 border-l-success">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <span class="badge badge-success badge-sm font-bold">ĐANG DIỄN RA</span>
              <lucide-angular [name]="Trophy" class="w-6 h-6 text-warning"></lucide-angular>
            </div>
            <h2 class="card-title text-2xl font-black">SS01: The Origin</h2>
            <div class="flex items-center gap-2 text-xs opacity-60">
              <lucide-angular [name]="Calendar" class="w-3 h-3"></lucide-angular>
              01/01/2026 - 31/03/2026
            </div>
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-sm btn-outline btn-ghost rounded-lg">Chi tiết</button>
            </div>
          </div>
        </div>

        <div class="card bg-base-100/50 shadow-sm border border-dashed border-base-300">
          <div class="card-body items-center justify-center text-center opacity-40">
            <lucide-angular [name]="Archive" class="w-10 h-10 mb-2"></lucide-angular>
            <p class="text-sm font-bold uppercase tracking-tighter">Lưu trữ Mùa giải cũ</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SeasonManagerComponent {
  readonly Trophy = Trophy;
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly Archive = Archive;
}
