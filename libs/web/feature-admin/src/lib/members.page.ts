import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberService } from '@ds/web/data-access';
import {
  HlmTableDirective,
  HlmTdDirective,
  HlmThDirective,
  HlmTrDirective,
  HlmInputDirective,
  HlmBtnDirective,
} from '@ds/web/ui-spartan';

@Component({
  selector: 'ds-members-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmTableDirective,
    HlmTdDirective,
    HlmThDirective,
    HlmTrDirective,
    HlmInputDirective,
    HlmBtnDirective,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Quản lý Thành viên</h2>
          <p class="text-muted-foreground">Xem và quản lý danh sách thành viên trong Clan.</p>
        </div>
        <button hlmBtn (click)="service.loadMembers()">Làm mới</button>
      </div>

      <div class="flex items-center py-4">
        <input
          hlmInput
          class="max-w-sm"
          placeholder="Tìm kiếm theo nickname hoặc IGN..."
          [(ngModel)]="searchQuery"
        />
      </div>

      <div class="rounded-md border">
        <table hlmTable>
          <thead>
            <tr hlmTr>
              <th hlmTh>ID Discord</th>
              <th hlmTh>Nickname</th>
              <th hlmTh>IGN</th>
              <th hlmTh>GS Code</th>
              <th hlmTh>Điểm</th>
              <th hlmTh>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            @for (member of filteredMembers(); track member.id) {
              <tr hlmTr>
                <td hlmTd class="font-mono text-xs">{{ member.discordId || 'N/A' }}</td>
                <td hlmTd class="font-medium">{{ member.nickname }}</td>
                <td hlmTd>{{ member.ign }}</td>
                <td hlmTd>{{ member.gsCode || 'N/A' }}</td>
                <td hlmTd>{{ member.points }}</td>
                <td hlmTd>
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    [ngClass]="
                      member.status === 'ACTIVE'
                        ? 'bg-success/20 text-success'
                        : 'bg-muted text-muted-foreground'
                    "
                  >
                    {{ member.status }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="6" class="h-24 text-center">Không tìm thấy thành viên nào.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class MembersPage implements OnInit {
  service = inject(MemberService);
  searchQuery = '';

  ngOnInit() {
    this.service.loadMembers();
  }

  filteredMembers() {
    const q = this.searchQuery.toLowerCase().trim();
    const members = this.service.members();

    if (!Array.isArray(members)) {
      return [];
    }

    if (!q) return members;

    return members.filter(
      (m) => m.nickname.toLowerCase().includes(q) || m.ign.toLowerCase().includes(q),
    );
  }
}
