import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Member } from '@ds/shared/models';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api-url.token';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_URL);

  // State
  private _members = signal<Member[]>([]);
  private _loading = signal<boolean>(false);

  members = computed(() => this._members());
  isLoading = computed(() => this._loading());

  /**
   * Tải danh sách thành viên từ API
   */
  async loadMembers() {
    this._loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<Member[]>(`${this.apiUrl}/members`));
      this._members.set(data);
    } catch (error) {
      console.error('Failed to load members', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Cập nhật thông tin thành viên (Thay thế Google Sheets)
   */
  async updateMember(id: string, data: Partial<Member>) {
    const updated = await firstValueFrom(
      this.http.patch<Member>(`${this.apiUrl}/members/${id}`, data),
    );
    this._members.update((ms) => ms.map((m) => (m.id === id ? updated : m)));
    return updated;
  }

  /**
   * Cập nhật điểm có kèm lý do (Audit Log)
   */
  async updatePoints(id: string, payload: { points: number; reason: string }) {
    const updated = await firstValueFrom(
      this.http.patch<Member>(`${this.apiUrl}/members/${id}/points`, payload),
    );
    this._members.update((ms) => ms.map((m) => (m.id === id ? updated : m)));
    return updated;
  }

  /**
   * Thêm thành viên mới
   */
  async createMember(data: Partial<Member>) {
    const created = await firstValueFrom(this.http.post<Member>(`${this.apiUrl}/members`, data));
    this._members.update((ms) => [...ms, created]);
    return created;
  }

  getTop3() {
    return computed(() => this.members().slice(0, 3));
  }
}
