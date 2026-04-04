import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MemberService } from '@ds/web/data-access';
import { Member } from '@ds/shared/models';
@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule],
  template: `
    <div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header class="text-center space-y-4">
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter uppercase">
          Hall of <span class="text-primary">Flame</span>
        </h1>
        <p class="text-xl opacity-70">The living legends of DarkStar Clan.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="stats shadow bg-base-100 border border-base-300">
          <div class="stat">
            <div class="stat-title text-primary font-bold">Current Season</div>
            <div class="stat-value text-3xl">Season 1</div>
            <div class="stat-desc">Ends in 24 days</div>
          </div>
        </div>
        <div class="stats shadow bg-base-100 border border-base-300">
          <div class="stat">
            <div class="stat-title text-secondary font-bold">Total Members</div>
            <div class="stat-value text-3xl">{{ members().length }}</div>
            <div class="stat-desc">Active in ranking</div>
          </div>
        </div>
        <div class="stats shadow bg-base-100 border border-base-300">
          <div class="stat">
            <div class="stat-title text-accent font-bold">Global Points</div>
            <div class="stat-value text-3xl">{{ totalPoints() | number }}</div>
            <div class="stat-desc font-bold">Clan Power Level</div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-2xl border border-base-300 overflow-hidden">
        <div class="p-6 border-b border-base-300 flex flex-wrap items-center justify-between gap-4">
          <h2 class="text-2xl font-bold">Clan Rankings</h2>
          <div class="form-control">
            <div class="input-group">
              <input
                type="text"
                placeholder="Search member..."
                class="input input-bordered w-full max-w-xs focus:input-primary"
                (input)="onSearch($event)"
              />
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table table-lg w-full">
            <thead class="bg-base-200">
              <tr>
                <th class="w-20">Rank</th>
                <th>Member</th>
                <th class="hidden md:table-cell">GS Code</th>
                <th class="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              @for (member of filteredMembers(); track member.id; let i = $index) {
                <tr class="hover:bg-base-200/50 transition-colors">
                  <td>
                    <div class="flex items-center justify-center">
                      @if (i < 3) {
                        <div
                          class="badge badge-lg border-none font-black text-white"
                          [class.bg-yellow-400]="i === 0"
                          [class.bg-slate-300]="i === 1"
                          [class.bg-orange-400]="i === 2"
                        >
                          {{ i + 1 }}
                        </div>
                      } @else {
                        <span class="font-bold opacity-50">#{{ i + 1 }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center space-x-3">
                      <div class="avatar pointer-events-none">
                        <div class="mask mask-squircle w-12 h-12 bg-base-300">
                          <img [src]="member.avatarUrl" [alt]="member.nickname" />
                        </div>
                      </div>
                      <div>
                        <div class="font-bold text-lg">{{ member.nickname }}</div>
                        <div class="text-sm opacity-60">{{ member.ign }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="hidden md:table-cell font-mono opacity-60">
                    <span class="badge badge-ghost font-bold">{{ member.gsCode }}</span>
                  </td>
                  <td class="text-right">
                    <span class="text-2xl font-black tabular-nums" [class.text-primary]="i < 3">{{
                      member.points | number
                    }}</span>
                    <span class="text-xs ml-1 opacity-50 font-bold uppercase">PTS</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-h: 100vh;
        background-color: oklch(var(--b2));
      }
    `,
  ],
})
export class LeaderboardComponent {
  private memberService = inject(MemberService);
  members = this.memberService.members;

  searchTerm = signal('');


  totalPoints = computed(() => this.members().reduce((sum: number, m: Member) => sum + m.points, 0));

  filteredMembers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.members();
    return this.members().filter(
      (m: Member) =>
        m.nickname.toLowerCase().includes(term) ||
        m.ign.toLowerCase().includes(term) ||
        m.gsCode.toLowerCase().includes(term),
    );
  });

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
