import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { AuthService } from '@ds/web/data-access';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authServiceMock: Partial<AuthService>;
  let routerMock: Partial<Router>;

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
      loginWithDiscord: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('login', () => {
    it('should not call auth.login if fields are empty', () => {
      component.username = '';
      component.password = '';
      component.login();
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should call auth.login and navigate on success', () => {
      component.username = 'testuser';
      component.password = 'password';
      authServiceMock.login.mockReturnValue(of({ access_token: 'abc' }));

      component.login();

      expect(authServiceMock.login).toHaveBeenCalledWith('testuser', 'password');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/members']);
    });

    it('should log error on failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(window, 'alert').mockImplementation(() => {
        /* noop */
      });

      component.username = 'testuser';
      component.password = 'wrong';
      authServiceMock.login.mockReturnValue(throwError(() => new Error('Unauthorized')));

      component.login();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('loginWithDiscord', () => {
    it('should call auth.loginWithDiscord', () => {
      component.loginWithDiscord();
      expect(authServiceMock.loginWithDiscord).toHaveBeenCalled();
    });
  });
});
