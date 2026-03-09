import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MemberService } from './core/services/member.service';
import { HlmButtonComponent } from './shared/ui/hlm-button.component';
import {
  HlmCardComponent,
  HlmCardContentComponent,
  HlmCardHeaderComponent,
  HlmCardTitleComponent,
} from './shared/ui/hlm-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HlmButtonComponent,
    HlmCardComponent,
    HlmCardHeaderComponent,
    HlmCardTitleComponent,
    HlmCardContentComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private memberService = inject(MemberService);

  // Access members from service (it's a signal)
  members = this.memberService.members;

  title = 'ds-website';
}
