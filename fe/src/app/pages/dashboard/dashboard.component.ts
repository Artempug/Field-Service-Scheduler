import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, catchError, of, startWith, map, switchMap } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { DashboardStats, RequestStatus } from '../../core/models';
import { StatusLabelPipe } from '../../shared/pipes/status-label.pipe';

interface LoadState<T> {
  loading: boolean;
  data?: T;
  error?: string;
}

const STATUS_ICONS: Record<string, string> = {
  new:         'fiber_new',
  scheduled:   'event',
  en_route:    'directions_car',
  in_progress: 'build',
  done:        'check_circle',
  cancelled:   'cancel',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, NgClass, RouterLink,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    StatusLabelPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private data = inject(DataService);

  state$!: Observable<LoadState<DashboardStats>>;

  statusKeys: RequestStatus[] = ['new', 'scheduled', 'en_route', 'in_progress', 'done', 'cancelled'];
  statusIcons: Record<string, string> = STATUS_ICONS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state$ = this.data.getDashboardStats().pipe(
      map(stats => ({ loading: false, data: stats })),
      startWith({ loading: true }),
      catchError(err => of({ loading: false, error: String(err) })),
    );
  }

  statusBarWidth(count: number, total: number): string {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  priorityLabel(p: number): string {
    return ['', 'Critical', 'High', 'Medium', 'Low', 'Minimal'][p] ?? `P${p}`;
  }
}
