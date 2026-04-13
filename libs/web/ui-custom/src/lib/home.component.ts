import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberService } from '@ds/web/data-access';

@Component({
  selector: 'ds-home-legacy',
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ===== HERO SECTION ===== -->
    <section class="hero-section">
      <div class="hero-bg">
        <img
          src="https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80"
          alt="DarkStar cosmic background"
          class="hero-bg-img"
        />
        <div class="hero-overlay"></div>
        <div class="hero-vignette"></div>
      </div>

      <div class="hero-content">
        <h1 class="hero-title font-heading">
          <span class="hero-title-dark">DARK</span><span class="hero-title-star">STAR</span>
        </h1>
        <p class="hero-subtitle font-heading">ELITE GAMING COMMUNITY</p>
        <div class="hero-buttons">
          <a routerLink="/hall-of-flame" class="hero-btn hero-btn-primary">
            <span class="hero-btn-dot"></span>
            LIVE LEADERBOARD
          </a>
          <a
            href="https://discord.gg/darkstar"
            target="_blank"
            rel="noopener noreferrer"
            class="hero-btn hero-btn-secondary"
          >
            JOIN DISCORD
          </a>
        </div>
        <div class="hero-scroll-indicator animate-float">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="8 12 12 16 16 12"></polyline>
            <line x1="12" y1="8" x2="12" y2="16"></line>
          </svg>
        </div>
      </div>
    </section>

    <!-- ===== ABOUT SECTION ===== -->
    <section class="about-section">
      <div class="about-container">
        <div class="about-header">
          <h2 class="section-title font-heading">ABOUT <span class="text-primary">US</span></h2>
          <div class="section-divider"></div>
        </div>

        <div class="about-grid">
          <div class="about-text">
            <p class="about-description">
              DarkStar is an elite gaming clan built for players who thrive on competition and
              camaraderie. Founded in the world of
              <strong class="text-primary">Grand Summoners</strong>, we push each other to achieve
              greatness in leaderboards, crest runs, and collaborative events.
            </p>
            <p class="about-description">
              Our goddess mascot <strong class="text-primary">Liza</strong> — the Star God of Gran
              Verge Kingdom — watches over us as we conquer every challenge the game throws our way.
            </p>
          </div>

          <div class="about-stats">
            <div class="stat-card">
              <div class="stat-value font-heading">{{ members().length || '50' }}+</div>
              <div class="stat-label">MEMBERS</div>
            </div>
            <div class="stat-card">
              <div class="stat-value font-heading">S1</div>
              <div class="stat-label">CURRENT SEASON</div>
            </div>
            <div class="stat-card">
              <div class="stat-value font-heading">24/7</div>
              <div class="stat-label">BOT ACTIVE</div>
            </div>
            <div class="stat-card">
              <div class="stat-value font-heading">2024</div>
              <div class="stat-label">FOUNDED</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== LEADERBOARD PREVIEW ===== -->
    <section class="preview-section">
      <div class="preview-container">
        <div class="about-header">
          <h2 class="section-title font-heading">
            TOP <span class="text-primary">CONTRIBUTORS</span>
          </h2>
          <div class="section-divider"></div>
          <p class="section-subtitle">Current season's finest warriors</p>
        </div>

        <div class="preview-grid">
          @for (member of members().slice(0, 3); track member.id; let i = $index) {
            <div class="preview-card" [class]="'preview-card-rank-' + (i + 1)">
              <div class="preview-rank font-heading">{{ getRankBadge(i) }}</div>
              <div class="preview-avatar">
                <img [src]="member.avatarUrl" [alt]="member.nickname" />
              </div>
              <h3 class="preview-name">{{ member.nickname }}</h3>
              <p class="preview-ign">{{ member.ign }}</p>
              <div class="preview-points font-heading">{{ member.points }}</div>
              <div class="preview-points-label">POINTS</div>
            </div>
          }
        </div>

        <div class="preview-cta">
          <a routerLink="/hall-of-flame" class="hero-btn hero-btn-secondary">
            VIEW FULL LEADERBOARD →
          </a>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-logo font-heading"><span class="text-primary">DARK</span>STAR</div>
        <p class="footer-tagline">Elite Gaming Community since 2024</p>
        <p class="footer-copy">&copy; 2026 DarkStar Clan • Built with Nx &amp; Angular</p>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* ===== HERO ===== */
      .hero-section {
        position: relative;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .hero-bg {
        position: absolute;
        inset: 0;
        z-index: 0;
      }
      .hero-bg-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.3) saturate(0.6);
      }
      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          oklch(5% 0 0 / 0.6) 0%,
          oklch(5% 0.02 85 / 0.3) 50%,
          oklch(8% 0 0 / 0.95) 100%
        );
      }
      .hero-vignette {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at center, transparent 40%, oklch(5% 0 0 / 0.7) 100%);
      }
      .hero-content {
        position: relative;
        z-index: 1;
        text-align: center;
        padding: 2rem;
      }
      .hero-title {
        font-size: clamp(4rem, 12vw, 10rem);
        line-height: 0.9;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }
      .hero-title-dark {
        color: oklch(95% 0.01 90);
      }
      .hero-title-star {
        color: oklch(82% 0.165 85);
        text-shadow:
          0 0 40px oklch(82% 0.165 85 / 0.4),
          0 0 80px oklch(82% 0.165 85 / 0.15);
      }
      .hero-subtitle {
        font-size: clamp(0.8rem, 2vw, 1.3rem);
        letter-spacing: 0.4em;
        color: oklch(65% 0.01 90);
        margin-bottom: 2.5rem;
      }
      .hero-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .hero-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.75rem;
        font-family: var(--font-heading);
        font-size: 0.85rem;
        letter-spacing: 0.15em;
        text-decoration: none;
        border: 1px solid;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .hero-btn-primary {
        background: oklch(82% 0.165 85 / 0.1);
        border-color: oklch(82% 0.165 85 / 0.5);
        color: oklch(82% 0.165 85);
      }
      .hero-btn-primary:hover {
        background: oklch(82% 0.165 85 / 0.2);
        border-color: oklch(82% 0.165 85);
        box-shadow: 0 0 25px oklch(82% 0.165 85 / 0.2);
      }
      .hero-btn-dot {
        width: 8px;
        height: 8px;
        background: oklch(65% 0.2 25);
        border-radius: 50%;
        animation: pulse-glow 2s ease-in-out infinite;
      }
      .hero-btn-secondary {
        background: transparent;
        border-color: oklch(50% 0 0);
        color: oklch(75% 0 0);
      }
      .hero-btn-secondary:hover {
        border-color: oklch(75% 0 0);
        color: oklch(95% 0 0);
        background: oklch(95% 0 0 / 0.05);
      }
      .hero-scroll-indicator {
        margin-top: 3rem;
        color: oklch(40% 0 0);
      }

      /* ===== SECTIONS SHARED ===== */
      .about-section,
      .preview-section {
        padding: 5rem 2rem;
      }
      .about-container,
      .preview-container {
        max-width: 1000px;
        margin: 0 auto;
      }
      .about-header {
        margin-bottom: 3rem;
      }
      .section-title {
        font-size: clamp(2rem, 5vw, 3.5rem);
        letter-spacing: 0.1em;
        color: oklch(93% 0.01 90);
      }
      .section-divider {
        width: 60px;
        height: 2px;
        background: oklch(82% 0.165 85);
        margin-top: 0.75rem;
        box-shadow: 0 0 10px oklch(82% 0.165 85 / 0.4);
      }
      .section-subtitle {
        color: oklch(50% 0 0);
        margin-top: 0.75rem;
        font-size: 0.9rem;
        letter-spacing: 0.05em;
      }

      /* ===== ABOUT ===== */
      .about-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: start;
      }
      @media (max-width: 768px) {
        .about-grid {
          grid-template-columns: 1fr;
        }
      }
      .about-description {
        color: oklch(65% 0 0);
        line-height: 1.8;
        margin-bottom: 1rem;
        font-size: 0.95rem;
      }
      .about-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .stat-card {
        background: oklch(11% 0 0);
        border: 1px solid oklch(18% 0.01 85 / 0.3);
        padding: 1.25rem;
        text-align: center;
        transition: all 0.3s ease;
      }
      .stat-card:hover {
        border-color: oklch(82% 0.165 85 / 0.4);
        box-shadow: 0 0 20px oklch(82% 0.165 85 / 0.08);
      }
      .stat-value {
        font-size: 2rem;
        color: oklch(82% 0.165 85);
        letter-spacing: 0.05em;
      }
      .stat-label {
        font-size: 0.65rem;
        letter-spacing: 0.15em;
        color: oklch(45% 0 0);
        margin-top: 0.25rem;
      }

      /* ===== LEADERBOARD PREVIEW ===== */
      .preview-section {
        background: oklch(6% 0 0);
        border-top: 1px solid oklch(15% 0 0);
      }
      .preview-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        margin-bottom: 2.5rem;
      }
      @media (max-width: 768px) {
        .preview-grid {
          grid-template-columns: 1fr;
          max-width: 320px;
          margin: 0 auto 2.5rem;
        }
      }
      .preview-card {
        background: oklch(10% 0 0);
        border: 1px solid oklch(18% 0 0);
        padding: 2rem 1.5rem;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .preview-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: oklch(82% 0.165 85 / 0.3);
        transition: all 0.3s;
      }
      .preview-card:hover {
        transform: translateY(-4px);
        border-color: oklch(82% 0.165 85 / 0.3);
      }
      .preview-card:hover::before {
        background: oklch(82% 0.165 85);
        box-shadow: 0 0 15px oklch(82% 0.165 85 / 0.4);
      }
      .preview-card-rank-1 {
        border-color: oklch(82% 0.165 85 / 0.3);
      }
      .preview-card-rank-rank-1::before {
        background: oklch(82% 0.165 85);
      }

      .preview-rank {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      .preview-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 1rem;
        border: 2px solid oklch(25% 0 0);
        transition: border-color 0.3s;
      }
      .preview-card:hover .preview-avatar {
        border-color: oklch(82% 0.165 85 / 0.5);
      }
      .preview-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .preview-name {
        font-weight: 700;
        font-size: 1.1rem;
        color: oklch(90% 0 0);
      }
      .preview-ign {
        font-size: 0.75rem;
        color: oklch(45% 0 0);
        margin-bottom: 0.75rem;
      }
      .preview-points {
        font-size: 2rem;
        color: oklch(82% 0.165 85);
        letter-spacing: 0.05em;
      }
      .preview-points-label {
        font-size: 0.6rem;
        letter-spacing: 0.2em;
        color: oklch(40% 0 0);
      }

      .preview-cta {
        text-align: center;
      }

      /* ===== FOOTER ===== */
      .site-footer {
        border-top: 1px solid oklch(15% 0 0);
        padding: 3rem 2rem;
        text-align: center;
      }
      .footer-logo {
        font-size: 1.5rem;
        letter-spacing: 0.15em;
        margin-bottom: 0.5rem;
      }
      .footer-tagline {
        color: oklch(40% 0 0);
        font-size: 0.8rem;
        letter-spacing: 0.1em;
      }
      .footer-copy {
        color: oklch(30% 0 0);
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        margin-top: 1rem;
        text-transform: uppercase;
      }
    `,
  ],
})
export class HomeComponent {
  private memberService = inject(MemberService);
  members = this.memberService.members;

  getRankBadge(index: number): string {
    return ['👑', '🥈', '🥉'][index] ?? `#${index + 1}`;
  }
}
