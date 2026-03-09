import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberService } from '../../core/services/member.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="hero min-h-screen bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">DarkStar <span class="text-primary">Clan</span></h1>
          <p class="py-6">
            The ultimate community for elite gamers. Track your progress, compete in seasons, and
            join the Hall of Flame.
          </p>
          <div class="flex gap-4 justify-center">
            <button class="btn btn-primary">Join Discord</button>
            <button class="btn btn-outline" routerLink="/hall-of-flame">View Hall of Flame</button>
          </div>
        </div>
      </div>
    </div>

    <section class="p-8 max-w-6xl mx-auto">
      <div class="card bg-base-100 shadow-xl border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Leaderboard Preview</h2>
          <p class="text-base-content/70 mb-6">Top contributors of the current season.</p>

          <div class="grid gap-4">
            @for (member of members().slice(0, 3); track member.id) {
              <div
                class="flex items-center justify-between p-4 rounded-xl bg-base-200/50 border border-base-300 hover:bg-base-200 transition-colors"
              >
                <div class="flex items-center gap-4">
                  <div class="avatar">
                    <div
                      class="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2"
                    >
                      <img [src]="member.avatarUrl" [alt]="member.nickname" />
                    </div>
                  </div>
                  <div>
                    <h4 class="font-bold text-lg">{{ member.nickname }}</h4>
                    <p class="text-sm opacity-70">{{ member.ign }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black text-primary">{{ member.points }}</div>
                  <div class="text-xs uppercase tracking-widest opacity-50 font-bold">Points</div>
                </div>
              </div>
            }
          </div>

          <div class="card-actions justify-center mt-8">
            <button class="btn btn-ghost" routerLink="/hall-of-flame">
              View Full Leaderboard →
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class HomeComponent {
  private memberService = inject(MemberService);
  members = this.memberService.members;
}
