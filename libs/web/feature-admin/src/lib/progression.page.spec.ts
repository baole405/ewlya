import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressionPage } from './progression.page';
import { ProgressionService } from '@ds/web/data-access';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ProgressionPage', () => {
  let component: ProgressionPage;
  let fixture: ComponentFixture<ProgressionPage>;

  const mockProgressionService = {
    getAllChecks: jest.fn().mockReturnValue(of([])),
    getSavedTitles: jest.fn().mockReturnValue(of([])),
    getCheckById: jest.fn(),
    createCheck: jest.fn(),
    updateMemberStatus: jest.fn(),
    deleteCheck: jest.fn(),
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

  it('should show create form when clicking create button', () => {
    component.showCreateForm.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('PROGRESSION.CREATE_CHECK');
  });
});
