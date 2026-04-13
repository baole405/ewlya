import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  HlmCardDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
  HlmCardDescriptionDirective,
  HlmCardContentDirective,
  HlmCardFooterDirective,
} from '@ds/web/ui-spartan';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSeparator } from '@spartan-ng/helm/separator';

@Component({
  selector: 'ds-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardDescriptionDirective,
    HlmCardContentDirective,
    HlmCardFooterDirective,
    HlmButton,
    HlmSeparator,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">{{ 'SETTINGS.TITLE' | translate }}</h2>
        <p class="text-muted-foreground">{{ 'SETTINGS.DESCRIPTION' | translate }}</p>
      </div>

      <hlm-separator />

      <div hlmCard>
        <div hlmCardHeader>
          <h3 hlmCardTitle>{{ 'SETTINGS.LANGUAGE' | translate }}</h3>
          <p hlmCardDescription>{{ 'SETTINGS.LANGUAGE_DESCRIPTION' | translate }}</p>
        </div>
        <div hlmCardContent class="grid gap-4">
          <div class="flex items-center space-x-4">
            <button
              hlmBtn
              [variant]="currentLang === 'vi' ? 'default' : 'outline'"
              (click)="changeLanguage('vi')"
            >
              🇻🇳 {{ 'SETTINGS.VI' | translate }}
            </button>
            <button
              hlmBtn
              [variant]="currentLang === 'en' ? 'default' : 'outline'"
              (click)="changeLanguage('en')"
            >
              🇬🇧 {{ 'SETTINGS.EN' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPage {
  private translate = inject(TranslateService);

  get currentLang() {
    return this.translate.currentLang || this.translate.defaultLang;
  }

  changeLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('ds_lang', lang);
  }
}
