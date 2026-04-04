import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MemberService } from '@ds/web/data-access';
import { Member } from '@ds/shared/models';

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule],
  template: `
    <div class="hof-page">
      <!-- Header -->
      <header class="hof-header">
        <h1 class="hof-title font-heading">
          HALL OF <span class="text-primary text-glow-gold">FLAME</span>
        </h1>
        <div class="section-divider" style="margin: 0 auto;"></div>
        <p class="hof-subtitle">The living legends of DarkStar Clan</p>
      </header>

      <!-- Stats Row -->
      <div class="hof-stats">
        <div class="hof-stat">
          <div class="hof-stat-value font-heading">Season 1</div>
          <div class="hof-stat-label">CURRENT SEASON</div>
        </div>
        <div class="hof-stat">
          <div class="hof-stat-value font-heading">{{ members().length }}</div>
          <div class="hof-stat-label">ACTIVE MEMBERS</div>
        </div>
        <div class="hof-stat">
          <div class="hof-stat-value font-heading">{{ totalPoints() | number }}</div>
          <div class="hof-stat-label">GLOBAL POWER</div>
        </div>
      </div>

      <!-- Table -->
      <div class="hof-table-wrapper">
        <div class="hof-table-header">
          <h2 class="hof-table-title font-heading">CLAN RANKINGS</h2>
          <input
            type="text"
            placeholder="Search member..."
            class="hof-search"
            aria-label="Search clan members"
            (input)="onSearch($event)"
          />
        </div>

        <div class="hof-table-container">
          <table class="hof-table">
            <thead>
              <tr>
                <th class="hof-th hof-th-rank">RANK</th>
                <th class="hof-th">MEMBER</th>
                <th class="hof-th hof-th-code">GS CODE</th>
                <th class="hof-th hof-th-points">POINTS</th>
              </tr>
            </thead>
            <tbody>
              @for (member of filteredMembers(); track member.id; let i = $index) {
                <tr class="hof-row" [class.hof-row-top]="i < 3">
                  <td class="hof-td hof-td-rank">
                    @if (i < 3) {
                      <span class="hof-badge" [class]="'hof-badge-' + (i + 1)">
                        {{ getRankBadge(i) }}
                      </span>
                    } @else {
                      <span class="hof-rank-num">#{{ i + 1 }}</span>
                    }
                  </td>
                  <td class="hof-td">
                    <div class="hof-member">
                      <div class="hof-avatar" [class.hof-avatar-top]="i < 3">
                        <img [src]="member.avatarUrl" [alt]="member.nickname" />
                      </div>
                      <div>
                        <div class="hof-name" [class.text-primary]="i === 0">{{ member.nickname }}</div>
                        <div class="hof-ign">{{ member.ign }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="hof-td hof-td-code">
                    <span class="hof-code">{{ member.gsCode }}</span>
                  </td>
                  <td class="hof-td hof-td-points">
                    <span class="hof-points font-heading" [class.text-primary]="i < 3">
                      {{ member.points | number }}
                    </span>
                    <span class="hof-pts-label">PTS</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .hof-page {
      min-height: 100vh;
      padding: 3rem 1.5rem;
      max-width: 960px;
      margin: 0 auto;
    }

    /* Header */
    .hof-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .hof-title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      letter-spacing: 0.1em;
      color: oklch(93% 0.01 90);
    }
    .section-divider {
      width: 60px; height: 2px;
      background: oklch(82% 0.165 85);
      margin-top: 0.75rem;
      box-shadow: 0 0 10px oklch(82% 0.165 85 / 0.4);
    }
    .hof-subtitle {
      color: oklch(45% 0 0);
      font-size: 0.9rem;
      letter-spacing: 0.1em;
      margin-top: 0.75rem;
    }

    /* Stats */
    .hof-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    @media (max-width: 640px) {
      .hof-stats { grid-template-columns: 1fr; }
    }
    .hof-stat {
      background: oklch(10% 0 0);
      border: 1px solid oklch(18% 0.01 85 / 0.2);
      padding: 1.25rem;
      text-align: center;
    }
    .hof-stat-value {
      font-size: 1.5rem;
      color: oklch(82% 0.165 85);
      letter-spacing: 0.05em;
    }
    .hof-stat-label {
      font-size: 0.6rem;
      letter-spacing: 0.15em;
      color: oklch(40% 0 0);
      margin-top: 0.25rem;
    }

    /* Table Wrapper */
    .hof-table-wrapper {
      background: oklch(9% 0 0);
      border: 1px solid oklch(16% 0.01 85 / 0.2);
      overflow: hidden;
    }
    .hof-table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid oklch(16% 0 0);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .hof-table-title {
      font-size: 1.1rem;
      letter-spacing: 0.15em;
      color: oklch(75% 0 0);
    }
    .hof-search {
      background: oklch(6% 0 0);
      border: 1px solid oklch(20% 0 0);
      color: oklch(85% 0 0);
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      outline: none;
      min-width: 200px;
      transition: border-color 0.3s;
    }
    .hof-search::placeholder { color: oklch(35% 0 0); }
    .hof-search:focus { border-color: oklch(82% 0.165 85 / 0.5); }

    /* Table */
    .hof-table-container { overflow-x: auto; }
    .hof-table {
      width: 100%;
      border-collapse: collapse;
    }
    .hof-th {
      padding: 0.75rem 1.5rem;
      font-family: var(--font-heading);
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: oklch(40% 0 0);
      text-align: left;
      background: oklch(7% 0 0);
      border-bottom: 1px solid oklch(14% 0 0);
    }
    .hof-th-rank { text-align: center; width: 80px; }
    .hof-th-code { text-align: center; }
    .hof-th-points { text-align: right; }

    @media (max-width: 640px) {
      .hof-th-code { display: none; }
    }

    .hof-row {
      border-bottom: 1px solid oklch(12% 0 0);
      transition: background 0.2s;
    }
    .hof-row:hover { background: oklch(12% 0.005 85 / 0.3); }
    .hof-row-top { background: oklch(11% 0.005 85 / 0.2); }

    .hof-td {
      padding: 0.85rem 1.5rem;
      vertical-align: middle;
    }
    .hof-td-rank { text-align: center; }
    .hof-td-code { text-align: center; }
    .hof-td-points { text-align: right; }

    @media (max-width: 640px) {
      .hof-td-code { display: none; }
    }

    /* Rank badges */
    .hof-badge {
      display: inline-flex;
      align-items: center; justify-content: center;
      width: 32px; height: 32px;
      font-size: 1.1rem;
    }
    .hof-rank-num {
      font-weight: 700;
      color: oklch(35% 0 0);
      font-size: 0.85rem;
    }

    /* Member cell */
    .hof-member {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .hof-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid oklch(20% 0 0);
      flex-shrink: 0;
    }
    .hof-avatar-top { border-color: oklch(82% 0.165 85 / 0.4); }
    .hof-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .hof-name { font-weight: 700; font-size: 0.95rem; }
    .hof-ign { font-size: 0.75rem; color: oklch(40% 0 0); }

    /* Code badge */
    .hof-code {
      font-family: monospace;
      font-size: 0.8rem;
      color: oklch(50% 0 0);
      background: oklch(12% 0 0);
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
    }

    /* Points */
    .hof-points {
      font-size: 1.5rem;
      letter-spacing: 0.03em;
    }
    .hof-pts-label {
      font-size: 0.55rem;
      letter-spacing: 0.15em;
      color: oklch(35% 0 0);
      margin-left: 0.25rem;
    }
  `],
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

  getRankBadge(index: number): string {
    return ['👑', '🥈', '🥉'][index] ?? `#${index + 1}`;
  }
}
