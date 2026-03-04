import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AsyncPipe, FormsModule,
    MatIconModule, MatButtonModule, MatSlideToggleModule,
    MatSelectModule, MatFormFieldModule, MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  theme   = inject(ThemeService);
  notify  = inject(NotificationService);
  langSvc = inject(LanguageService);

  pageSize = 10;
  language = 'en';

  ngOnInit(): void {
    const saved = localStorage.getItem('fss-page-size');
    if (saved) this.pageSize = Number(saved);
    this.language = this.langSvc.current;
  }

  savePageSize(): void {
    localStorage.setItem('fss-page-size', String(this.pageSize));
    this.notify.success(this.langSvc.t('settings.saved'));
  }

  saveLanguage(): void {
    this.langSvc.setLanguage(this.language);
    this.notify.success(this.langSvc.t('settings.lang-saved'));
  }

  exportData(): void {
    if (window.api) {
      window.api.export.csv().then(result => {
        if (result.success) {
          this.notify.success(`${this.langSvc.t('settings.export-ok')} ${result.path}`);
        }
      }).catch(err => {
        this.notify.error(`${this.langSvc.t('settings.export-fail')} ${(err as Error).message}`);
      });
    } else {
      this.notify.info(this.langSvc.t('settings.export-electron'));
    }
  }

  showTestNotification(): void {
    this.notify.info('This is a test notification from FieldScheduler.');
  }
}
