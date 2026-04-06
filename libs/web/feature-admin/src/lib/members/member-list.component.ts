import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '@ds/web/data-access';
import {
  LucideAngularModule,
  Search,
  UserPlus,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-angular';
import { Member } from '@ds/shared/models';

@Component({
  selector: 'ds-member-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <!-- Page Header -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black">Quản lý Thành viên</h1>
          <p class="text-base-content/60">Danh sách toàn bộ member trong DarkStar Clan.</p>
        </div>
        <button class="btn btn-primary shadow-lg shadow-primary/20 rounded-xl">
          <lucide-angular [name]="UserPlus" class="w-4 h-4 mr-2"></lucide-angular>
          Thêm Member
        </button>
      </header>

      <!-- Filters & Search -->
      <div
        class="flex flex-col md:flex-row gap-4 bg-base-100 p-4 rounded-2xl shadow-sm border border-base-200"
      >
        <div class="relative flex-1">
          <lucide-angular
            [name]="Search"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
          ></lucide-angular>
          <input
            type="text"
            placeholder="Tìm kiếm theo nickname, ign, gs code..."
            class="input input-bordered w-full pl-10 bg-base-200/50 border-none rounded-xl"
          />
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost bg-base-200/50 rounded-xl">
            <lucide-angular [name]="Filter" class="w-4 h-4 mr-2"></lucide-angular>
            Lọc
          </button>
        </div>
      </div>

      <!-- Members Table -->
      <div class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead class="bg-base-200/50">
              <tr>
                <th class="font-bold uppercase text-[10px] tracking-widest opacity-50">Member</th>
                <th class="font-bold uppercase text-[10px] tracking-widest opacity-50">
                  ID / GS Code
                </th>
                <th class="font-bold uppercase text-[10px] tracking-widest opacity-50">
                  Thông tin (Domain)
                </th>
                <th class="font-bold uppercase text-[10px] tracking-widest opacity-50 text-right">
                  Points
                </th>
                <th class="font-bold uppercase text-[10px] tracking-widest opacity-50"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of members()" class="hover:bg-base-200/30 transition-colors">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar">
                      <div class="mask mask-squircle w-10 h-10 bg-base-300">
                        <img
                          [src]="
                            m.avatarUrl ||
                            'https://api.dicebear.com/7.x/avataaars/svg?seed=' + m.nickname
                          "
                          alt="Avatar"
                        />
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ m.nickname }}</div>
                      <div class="text-xs opacity-50 font-medium">IGN: {{ m.ign }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-xs space-y-0.5">
                    <div
                      class="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded inline-block"
                    >
                      Discord: {{ m.discordId }}
                    </div>
                    <div
                      class="font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded block w-fit"
                    >
                      GS: {{ m.gsCode || '---' }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-[10px] leading-tight space-y-1">
                    <div class="flex items-center gap-1">
                      <span class="badge badge-outline badge-xs">{{ m.gender || 'Chưa rõ' }}</span>
                      <span class="badge badge-outline badge-xs uppercase">{{
                        m.country || 'International'
                      }}</span>
                    </div>
                    <div
                      class="opacity-70 italic whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
                    >
                      A.K.A: {{ m.aka || 'None' }}
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <span class="font-black text-primary">{{ m.points }}</span>
                </td>
                <th class="text-right">
                  <div class="dropdown dropdown-left">
                    <div tabindex="0" role="button" class="btn btn-ghost btn-xs btn-circle">
                      <lucide-angular [name]="MoreVertical" class="w-4 h-4"></lucide-angular>
                    </div>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-100 rounded-box w-40 border border-base-200"
                    >
                      <li>
                        <a
                          ><lucide-angular [name]="Edit2" class="w-4 h-4 mr-2"></lucide-angular>
                          Chỉnh sửa</a
                        >
                      </li>
                      <li>
                        <a class="text-error"
                          ><lucide-angular [name]="Trash2" class="w-4 h-4 mr-2"></lucide-angular>
                          Xóa</a
                        >
                      </li>
                    </ul>
                  </div>
                </th>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="members().length === 0 && !isLoading()">
                <td colspan="5" class="py-20 text-center opacity-30 italic">
                  Chưa có thành viên nào...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class MemberListComponent implements OnInit {
  private memberService = inject(MemberService);

  members = this.memberService.members;
  isLoading = this.memberService.isLoading;

  readonly Search = Search;
  readonly UserPlus = UserPlus;
  readonly Filter = Filter;
  readonly MoreVertical = MoreVertical;
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;

  ngOnInit() {
    this.memberService.loadMembers();
  }
}
