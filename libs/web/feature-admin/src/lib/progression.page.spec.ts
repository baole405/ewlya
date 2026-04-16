import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressionPage } from './progression.page';
import { ProgressionService } from '@ds/web/data-access';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProgressionPage', () => {
  let component: ProgressionPage;
  let fixture: ComponentFixture<ProgressionPage>;

  const mockProgressionService = {
    getAllChecks: vi.fn().mockReturnValue(of([])),
    getSavedTitles: vi.fn().mockReturnValue(of([])),
    getCheckById: vi.fn().mockReturnValue(of(null)),
    createCheck: vi.fn(),
    updateMemberStatus: vi.fn(),
    updateMemberRequirementStatus: vi.fn(),
    deleteCheck: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressionPage, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [{ provide: ProgressionService, useValue: mockProgressionService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load checks and titles on init', () => {
    expect(mockProgressionService.getAllChecks).toHaveBeenCalled();
    expect(mockProgressionService.getSavedTitles).toHaveBeenCalled();
  });
});
