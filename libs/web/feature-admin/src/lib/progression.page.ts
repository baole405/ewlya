import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressionService, ProgressionCheck, MemberProgressionStatus } from '@ds/web/data-access';
import {
  HlmTableDirective,
  HlmTdDirective,
  HlmThDirective,
  HlmTrDirective,
  HlmInputDirective,
  HlmBtnDirective,
  HlmCardDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
  HlmCardDescriptionDirective,
  HlmCardContentDirective,
} from '@ds/web/ui-spartan';
import { TranslateModule } from '@ngx-translate/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideChevronLeft,
  lucideSave,
  lucideFileText,
  lucideTrash,
  lucideRefreshCcw,
  lucideCalendar,
  lucideFlag,
  lucideX,
  lucideCheckCircle2,
  lucideInfo,
} from '@ng-icons/lucide';

@Component({
  selector: 'ds-progression-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgIconComponent,
    HlmTableDirective,
    HlmTdDirective,
    HlmThDirective,
    HlmTrDirective,
    HlmInputDirective,
    HlmBtnDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardDescriptionDirective,
    HlmCardContentDirective,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideChevronLeft,
      lucideSave,
      lucideFileText,
      lucideTrash,
      lucideRefreshCcw,
      lucideCalendar,
      lucideFlag,
      lucideX,
      lucideCheckCircle2,
      lucideInfo,
    }),
  ],
  template: `
    <div class="space-y-6 pb-20">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">{{ 'PROGRESSION.TITLE' | translate }}</h2>
          <p class="text-muted-foreground">{{ 'PROGRESSION.DESCRIPTION' | translate }}</p>
        </div>

        <div class="flex items-center gap-2">
          @if (!selectedCheck() && !showCreateForm()) {
            <!-- Tabs - Improved UI -->
            <div class="flex p-1 bg-muted/50 rounded-lg mr-4 border border-border/50">
              <button
                hlmBtn
                variant="ghost"
                size="sm"
                class="px-4 py-1.5 transition-all duration-200"
                [class.bg-background]="currentTab() === 'active'"
                [class.shadow-sm]="currentTab() === 'active'"
                [class.text-primary]="currentTab() === 'active'"
                (click)="setTab('active')"
              >
                Đang chạy
              </button>

              <button
                hlmBtn
                variant="ghost"
                size="sm"
                class="px-4 py-1.5 transition-all duration-200"
                [class.bg-background]="currentTab() === 'ended'"
                [class.shadow-sm]="currentTab() === 'ended'"
                [class.text-primary]="currentTab() === 'ended'"
                (click)="setTab('ended')"
              >
                Đã kết thúc
              </button>

              <button
                hlmBtn
                variant="ghost"
                size="sm"
                class="px-4 py-1.5 transition-all duration-200"
                [class.bg-background]="currentTab() === 'trash'"
                [class.shadow-sm]="currentTab() === 'trash'"
                [class.text-destructive]="currentTab() === 'trash'"
                [class.opacity-50]="currentTab() !== 'trash'"
                (click)="setTab('trash')"
              >
                Thùng rác
              </button>
            </div>
          }

          @if (!selectedCheck()) {
            <button
              hlmBtn
              (click)="showCreateForm.set(true)"
              *ngIf="!showCreateForm() && currentTab() !== 'trash'"
            >
              <ng-icon name="lucidePlus" class="mr-2" />
              {{ 'PROGRESSION.CREATE_CHECK' | translate }}
            </button>
            <button
              hlmBtn
              variant="outline"
              (click)="showCreateForm.set(false)"
              *ngIf="showCreateForm()"
            >
              Huỷ
            </button>
          } @else {
            <button hlmBtn variant="outline" (click)="selectedCheck.set(null)">
              <ng-icon name="lucideChevronLeft" class="mr-2" />
              Quay lại danh sách
            </button>
          }
        </div>
      </div>

      <!-- Create Form -->
      @if (showCreateForm() && !selectedCheck()) {
        <div hlmCard class="max-w-xl mx-auto border-primary/20 shadow-lg">
          <div hlmCardHeader>
            <h3 hlmCardTitle>{{ 'PROGRESSION.CREATE_CHECK' | translate }}</h3>
          </div>
          <div hlmCardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">{{ 'PROGRESSION.FORM_TITLE' | translate }}</label>
              <input
                hlmInput
                class="w-full"
                [(ngModel)]="newCheck.title"
                placeholder="Ví dụ: Đóng phí tháng 5"
                list="progression-titles"
              />
              <datalist id="progression-titles">
                @for (title of savedTitles(); track title) {
                  <option [value]="title"></option>
                }
              </datalist>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">Ngày bắt đầu</label>
                <input type="date" hlmInput class="w-full" [(ngModel)]="newCheck.startDate" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Ngày kết thúc (Dự kiến)</label>
                <input type="date" hlmInput class="w-full" [(ngModel)]="newCheck.endDate" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">{{
                'PROGRESSION.FORM_DESCRIPTION' | translate
              }}</label>
              <textarea
                hlmInput
                class="w-full min-h-[60px]"
                [(ngModel)]="newCheck.description"
                placeholder="Mô tả chi tiết..."
              ></textarea>
            </div>

            <!-- Requirements Section -->
            <div class="space-y-3 pt-2 border-t border-border/50">
              <div class="flex items-center justify-between">
                <label class="text-sm font-bold flex items-center gap-2">
                  <ng-icon name="lucideInfo" class="text-primary" />
                  Điều kiện bắt buộc (Requirements)
                </label>
                <button
                  hlmBtn
                  variant="ghost"
                  size="sm"
                  class="h-7 text-[11px]"
                  (click)="addRequirement()"
                >
                  <ng-icon name="lucidePlus" class="mr-1" />
                  Thêm điều kiện
                </button>
              </div>

              <div class="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                @for (req of newRequirements(); track $index) {
                  <div class="flex items-center gap-2 group">
                    <input
                      hlmInput
                      class="flex-1 h-8 text-sm"
                      [(ngModel)]="req.title"
                      placeholder="Tên điều kiện (VD: Đánh Boss 10 lần)"
                    />
                    <input
                      hlmInput
                      class="w-24 h-8 text-sm"
                      [(ngModel)]="req.targetValue"
                      placeholder="Số lượng (nếu có)"
                    />
                    <button
                      hlmBtn
                      variant="ghost"
                      size="sm"
                      class="h-8 w-8 p-0 text-destructive opacity-50 group-hover:opacity-100"
                      (click)="removeRequirement($index)"
                    >
                      <ng-icon name="lucideX" />
                    </button>
                  </div>
                } @empty {
                  <p
                    class="text-[11px] text-muted-foreground italic text-center py-2 bg-muted/30 rounded border border-dashed"
                  >
                    Chưa có điều kiện nào. Nhấn "Thêm điều kiện" để bắt đầu.
                  </p>
                }
              </div>
            </div>

            <button
              hlmBtn
              class="w-full mt-4"
              [disabled]="!newCheck.title || newRequirements().length === 0"
              (click)="createCheck()"
            >
              Tạo đợt Check
            </button>
          </div>
        </div>
      }

      <!-- List View -->
      @if (!selectedCheck() && !showCreateForm()) {
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          @for (check of checks(); track check.id) {
            <div
              hlmCard
              class="group relative cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
              (click)="selectCheck(check)"
            >
              <div hlmCardHeader>
                <div class="flex items-start justify-between">
                  <h3 hlmCardTitle class="text-xl">{{ check.title }}</h3>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    @if (currentTab() === 'trash') {
                      <button
                        hlmBtn
                        variant="ghost"
                        size="sm"
                        class="text-primary h-8 w-8 p-0"
                        (click)="$event.stopPropagation(); restoreCheck(check.id)"
                      >
                        <ng-icon name="lucideRefreshCcw" />
                      </button>
                    }
                    <button
                      hlmBtn
                      variant="ghost"
                      size="sm"
                      [class.text-destructive]="currentTab() !== 'trash'"
                      class="h-8 w-8 p-0"
                      (click)="$event.stopPropagation(); deleteCheck(check.id)"
                    >
                      <ng-icon name="lucideTrash" />
                    </button>
                  </div>
                </div>
                <p hlmCardDescription class="line-clamp-2 min-h-[2.5rem]">
                  {{ check.description || 'Không có mô tả' }}
                </p>
              </div>
              <div hlmCardContent>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center text-sm font-medium">
                    <div class="flex -space-x-2 mr-3">
                      <div
                        class="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px]"
                      >
                        {{ check._count?.memberStatuses }}
                      </div>
                    </div>
                    <span class="text-muted-foreground">Thành viên tham gia</span>
                  </div>

                  <div class="flex items-center justify-between mt-2 pt-2 border-t">
                    <div class="flex items-center text-xs text-muted-foreground">
                      <ng-icon name="lucideCalendar" class="mr-1" />
                      {{ check.startDate | date: 'dd/MM' }} -
                      {{ check.endDate ? (check.endDate | date: 'dd/MM/yyyy') : '∞' }}
                    </div>
                    <div
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="
                        currentTab() === 'trash'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                      "
                    >
                      {{
                        currentTab() === 'active'
                          ? 'Đang chạy'
                          : currentTab() === 'ended'
                            ? 'Kết thúc'
                            : 'Trong rác'
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div
              class="col-span-full h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20"
            >
              <ng-icon name="lucideFileText" class="text-4xl mb-2 opacity-20" />
              {{
                currentTab() === 'trash'
                  ? 'Thùng rác trống'
                  : 'Chưa có đợt kiểm tra nào trong danh mục này.'
              }}
            </div>
          }
        </div>
      }

      <!-- Detail View / Member Management -->
      @if (selectedCheck(); as check) {
        <div class="space-y-4 max-w-5xl mx-auto">
          <div hlmCard class="overflow-hidden border-primary/20">
            <div
              class="bg-primary/5 px-6 py-4 flex flex-row items-center justify-between border-b border-primary/10"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-2xl font-bold">{{ check.title }}</h3>
                  <div class="flex items-center gap-1">
                    @if (currentTab() === 'active') {
                      <button
                        hlmBtn
                        variant="outline"
                        size="sm"
                        class="h-8 border-orange-200 text-orange-600 hover:bg-orange-50 px-3"
                        (click)="forceEndCheck(check.id)"
                      >
                        Chốt đợt check sớm
                      </button>
                    }
                    <button
                      hlmBtn
                      variant="ghost"
                      size="sm"
                      class="text-destructive h-8 w-8 p-0"
                      (click)="deleteCheck(check.id)"
                    >
                      <ng-icon name="lucideTrash" />
                    </button>
                  </div>
                </div>
                <p class="text-muted-foreground mt-1 text-sm">{{ check.description }}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-medium">
                  <span class="flex items-center"
                    ><ng-icon name="lucideCalendar" class="mr-1" /> Bắt đầu:
                    {{ check.startDate | date: 'dd/MM/yyyy' }}</span
                  >
                  @if (check.endDate) {
                    <span class="flex items-center"
                      ><ng-icon name="lucideFlag" class="mr-1" /> Hạn chót:
                      {{ check.endDate | date: 'dd/MM/yyyy' }}</span
                    >
                  }
                </div>
              </div>
              <div class="text-right flex flex-col items-end pl-8 border-l border-primary/10">
                <div class="text-4xl font-black text-primary">{{ getCompletionRate(check) }}%</div>
                <div class="w-32 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    class="bg-primary h-full transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    [style.width.%]="getCompletionRate(check)"
                  ></div>
                </div>
                <span
                  class="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold"
                  >Hoàn thành</span
                >
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-card shadow-sm overflow-hidden border-primary/10">
            <table hlmTable>
              <thead>
                <tr hlmTr class="bg-muted/30">
                  <th hlmTh class="w-[220px] pl-6 py-3 font-bold">Thành viên</th>
                  @for (req of check.requirements; track req.id) {
                    <th hlmTh class="text-center py-3 font-bold min-w-[100px]">
                      <div class="flex flex-col items-center">
                        <span class="text-[10px] uppercase tracking-wider text-muted-foreground">{{
                          req.title
                        }}</span>
                        @if (req.targetValue) {
                          <span class="text-[9px] font-mono text-primary/70"
                            >Mục tiêu: {{ req.targetValue }}</span
                          >
                        }
                      </div>
                    </th>
                  }
                  <th
                    hlmTh
                    class="w-[140px] text-center py-3 font-bold bg-primary/5 border-l border-primary/10"
                  >
                    Tổng kết
                  </th>
                  <th hlmTh class="py-3 font-bold">Ghi chú</th>
                  <th hlmTh class="w-[80px] text-right pr-6 py-3 font-bold">Lưu</th>
                </tr>
              </thead>
              <tbody>
                @for (status of check.memberStatuses; track status.id) {
                  <tr
                    hlmTr
                    class="group hover:bg-primary/5 transition-all"
                    [class.opacity-60]="status.member.status === 'TRIAL'"
                  >
                    <td hlmTd class="pl-6">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-1.5 h-8 rounded-full shadow-sm"
                          [ngClass]="getFlagColor(status, check)"
                        ></div>
                        <div class="flex flex-col">
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-sm">{{ status.member.nickname }}</span>
                            @if (status.member.status === 'TRIAL') {
                              <span
                                class="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter"
                                >Trial</span
                              >
                            }
                          </div>
                          <span
                            class="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter"
                            >{{ status.member.ign }}</span
                          >
                        </div>
                      </div>
                    </td>

                    <!-- Dynamic Requirements Columns -->
                    @for (reqStatus of status.member.requirementStatuses; track reqStatus.id) {
                      <td hlmTd class="text-center">
                        <button
                          class="w-6 h-6 rounded border transition-all flex items-center justify-center mx-auto"
                          [class.bg-primary]="reqStatus.isMet"
                          [class.border-primary]="reqStatus.isMet"
                          [class.text-primary-foreground]="reqStatus.isMet"
                          [class.border-muted-foreground/30]="!reqStatus.isMet"
                          (click)="toggleRequirement(reqStatus)"
                        >
                          <ng-icon name="lucideCheckCircle2" size="14" *ngIf="reqStatus.isMet" />
                        </button>
                      </td>
                    }

                    <td hlmTd class="text-center bg-primary/5 border-l border-primary/10">
                      <div class="flex flex-col items-center gap-1">
                        <button
                          hlmBtn
                          [variant]="status.isCompleted ? 'default' : 'outline'"
                          size="sm"
                          class="min-w-[100px] h-7 text-[10px] font-bold transition-all shadow-sm"
                          [class.border-green-500]="status.isCompleted"
                          [class.text-green-600]="status.isCompleted"
                          [class.hover:bg-green-50]="status.isCompleted"
                          (click)="toggleStatus(status)"
                        >
                          {{ status.isCompleted ? 'XÁC NHẬN OK' : 'CHƯA ĐẠT' }}
                        </button>
                        @if (status.isCompleted && status.completedAt) {
                          <span class="text-[9px] text-muted-foreground font-medium italic">
                            {{ status.completedAt | date: 'dd/MM HH:mm' }}
                          </span>
                        }
                      </div>
                    </td>
                    <td hlmTd>
                      <input
                        hlmInput
                        class="w-full h-8 text-sm bg-transparent border-dashed border-muted-foreground/30 focus:border-solid hover:bg-background transition-all"
                        [(ngModel)]="status.note"
                        [class.border-destructive]="!status.isCompleted && !status.note"
                        placeholder="Lưu ý/BRs..."
                      />
                    </td>
                    <td hlmTd class="text-right pr-6">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all rounded-full"
                        (click)="saveStatus(status)"
                      >
                        <ng-icon name="lucideSave" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Flag Legend -->
          <div
            class="flex items-center gap-6 text-[10px] text-muted-foreground px-4 py-3 bg-muted/20 rounded-xl border border-border/50 shadow-inner"
          >
            <div class="flex items-center gap-2 mr-2">
              <span class="font-bold uppercase opacity-50">Chú thích:</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
              ></div>
              Đúng hạn
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"
              ></div>
              Hoàn thành trễ
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"
              ></div>
              Quá hạn/Chưa xong
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-gray-300"></div>
              Đang theo dõi
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProgressionPage implements OnInit {
  private service: ProgressionService = inject(ProgressionService);

  checks = signal<ProgressionCheck[]>([]);
  savedTitles = signal<string[]>([]);
  selectedCheck = signal<ProgressionCheck | null>(null);
  showCreateForm = signal(false);
  currentTab = signal<'active' | 'ended' | 'trash'>('active');

  newCheck = {
    title: '',
    description: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: '',
  };

  newRequirements = signal<{ title: string; targetValue?: string }[]>([]);

  addRequirement() {
    this.newRequirements.update((reqs) => [...reqs, { title: '', targetValue: '' }]);
  }

  removeRequirement(index: number) {
    this.newRequirements.update((reqs) => reqs.filter((_, i) => i !== index));
  }

  ngOnInit() {
    this.loadChecks();
  }

  setTab(tab: 'active' | 'ended' | 'trash') {
    this.currentTab.set(tab);
    this.selectedCheck.set(null); // Luôn về danh sách khi đổi tab
    this.loadChecks();
  }

  loadChecks() {
    this.service.getAllChecks(this.currentTab()).subscribe({
      next: (data) => this.checks.set(data),
      error: (err) => console.error('Error loading checks:', err),
    });
    this.loadSavedTitles();
  }

  loadSavedTitles() {
    this.service.getSavedTitles().subscribe((data) => {
      this.savedTitles.set(data);
    });
  }

  selectCheck(check: ProgressionCheck) {
    if (this.currentTab() === 'trash') return; // Không cho vào detail nếu đang trong trash

    this.service.getCheckById(check.id).subscribe((data) => {
      this.selectedCheck.set(data);
      this.showCreateForm.set(false);
    });
  }

  createCheck() {
    this.service
      .createCheck({
        ...this.newCheck,
        requirements: this.newRequirements(),
      })
      .subscribe(() => {
        this.newCheck = {
          title: '',
          description: '',
          startDate: new Date().toISOString().substring(0, 10),
          endDate: '',
        };
        this.newRequirements.set([]);
        this.showCreateForm.set(false);
        this.loadChecks();
      });
  }

  toggleRequirement(reqStatus: any) {
    reqStatus.isMet = !reqStatus.isMet;
    this.service.updateMemberRequirementStatus(reqStatus.id, reqStatus.isMet).subscribe();
  }

  toggleStatus(status: MemberProgressionStatus) {
    status.isCompleted = !status.isCompleted;
    if (status.isCompleted) {
      status.completedAt = new Date().toISOString();
    } else {
      status.completedAt = undefined;
    }
  }

  saveStatus(status: MemberProgressionStatus) {
    this.service
      .updateMemberStatus(status.id, {
        isCompleted: status.isCompleted,
        note: status.note,
      })
      .subscribe();
  }

  deleteCheck(id: string) {
    const isTrash = this.currentTab() === 'trash';
    const msg = isTrash
      ? 'Bạn có chắc chắn muốn xóa VĨNH VIỄN đợt check này?'
      : 'Bạn có chắc chắn muốn bỏ đợt check này vào thùng rác?';

    if (window.confirm(msg)) {
      this.service.deleteCheck(id).subscribe({
        next: () => {
          this.selectedCheck.set(null);
          this.loadChecks();
        },
        error: (err) => {
          console.error('Delete error:', err);
          alert('Không thể xóa. Vui lòng thử lại.');
        },
      });
    }
  }

  restoreCheck(id: string) {
    this.service.restoreCheck(id).subscribe({
      next: () => {
        this.loadChecks();
      },
      error: (err) => {
        console.error('Restore error:', err);
        alert('Không thể khôi phục. Vui lòng thử lại.');
      },
    });
  }

  forceEndCheck(id: string) {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc đợt check này ngay bây giờ?')) {
      this.service.endCheck(id).subscribe({
        next: () => {
          this.selectedCheck.set(null);
          this.loadChecks();
        },
        error: (err) => {
          console.error('Force end error:', err);
          alert('Không thể chốt sớm. Vui lòng thử lại.');
        },
      });
    }
  }

  getFlagColor(status: MemberProgressionStatus, check: ProgressionCheck): string {
    const now = new Date();
    const endDate = check.endDate ? new Date(check.endDate) : null;
    const completedAt = status.completedAt ? new Date(status.completedAt) : null;

    if (!status.isCompleted) {
      if (endDate && now > endDate) return 'bg-red-500';
      return 'bg-gray-300';
    }

    if (endDate && completedAt) {
      if (completedAt > endDate) return 'bg-yellow-500';
      return 'bg-green-500';
    }

    return 'bg-green-500';
  }

  getCompletionRate(check: ProgressionCheck): number {
    if (!check.memberStatuses || check.memberStatuses.length === 0) return 0;
    const completed = check.memberStatuses.filter(
      (s: MemberProgressionStatus) => s.isCompleted,
    ).length;
    return Math.round((completed / check.memberStatuses.length) * 100);
  }
}
