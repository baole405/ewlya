import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MemberService } from './services/member.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private memberService = inject(MemberService);

  // Access members from service (it's a signal)
  members = this.memberService.members;

  title = 'ds-website';
}
