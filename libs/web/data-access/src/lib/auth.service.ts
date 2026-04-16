import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api-url.token';

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'MEMBER' | 'MODERATOR';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private apiUrl = inject(API_URL);

  // State management via Signals
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);

  user = computed(() => this._user());
  isAdmin = computed(() => this._user()?.role === 'ADMIN');
  isAuthenticated = computed(() => !!this._token());

  constructor() {
    this.loadSession();
  }

  /**
   * Khởi tạo session từ LocalStorage (chỉ chạy ở Browser)
   */
  private loadSession() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('ds_token');
      const userJson = localStorage.getItem('ds_user');

      if (token && userJson) {
        this._token.set(token);
        this._user.set(JSON.parse(userJson));
      }
    }
  }

  /**
   * Đăng nhập bằng username/password
   */
  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap((res) => {
        this.setSession(res.access_token, res.user);
      }),
    );
  }

  /**
   * Chuyển hướng đến Auth Discord trên Backend
   */
  loginWithDiscord() {
    window.location.href = `${this.apiUrl}/auth/discord`;
  }

  /**
   * Lưu session sau khi login thành công
   */
  setSession(token: string, user: User) {
    this._token.set(token);
    this._user.set(user);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('ds_token', token);
      localStorage.setItem('ds_user', JSON.stringify(user));
    }
  }

  /**
   * Đăng xuất
   */
  logout() {
    this._token.set(null);
    this._user.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('ds_token');
      localStorage.removeItem('ds_user');
    }
  }

  /**
   * Lấy token hiện tại cho Interceptor
   */
  getToken(): string | null {
    return this._token();
  }
}
