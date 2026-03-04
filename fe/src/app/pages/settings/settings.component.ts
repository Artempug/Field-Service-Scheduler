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

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AsyncPipe, FormsModule,
    MatIconModule, MatButtonModule, MatSlideToggleModule,
    MatSelectModule, MatFormFieldModule, MatDividerModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  theme  = inject(ThemeService);
  notify = inject(NotificationService);

  pageSize = 10;
  language = 'en';
  exportFormat = 'csv';

  ngOnInit(): void {
    const saved = localStorage.getItem('fss-page-size');
    if (saved) this.pageSize = Number(saved);
    const lang = localStorage.getItem('fss-language');
    if (lang) this.language = lang;
  }

  savePageSize(): void {
    localStorage.setItem('fss-page-size', String(this.pageSize));
    this.notify.success('Preferences saved.');
  }

  saveLanguage(): void {
    localStorage.setItem('fss-language', this.language);
    this.notify.success('Language preference saved.');
  }

  exportData(): void {
    const data = [
      ['ID', 'Title', 'Status', 'Priority', 'Customer', 'Zone', 'Created'],
      ['1', 'HVAC Unit Installation', 'scheduled', '2', 'Acme Corporation', 'North', '2024-04-01'],
      ['2', 'Electrical Panel Repair', 'in_progress', '1', 'Tech Solutions LLC', 'South', '2024-04-02'],
      ['...', '(open the requests page for full data)', '', '', '', '', ''],
    ];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fss-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notify.success('Export started — file downloaded.');
  }

  showTestNotification(): void {
    this.notify.info('This is a test notification from FieldScheduler.');
  }
}
