import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  BehaviorSubject, combineLatest, switchMap, tap, catchError, of,
} from 'rxjs';
import { debounceTime, startWith, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { AuditLog, PagedResult } from '../../core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, NgClass, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent implements OnInit {
  private dataService = inject(DataService);
  private destroy$    = new Subject<void>();

  filterForm = new FormGroup({
    actor:  new FormControl(''),
    entity: new FormControl(''),
    action: new FormControl(''),
  });

  entities = ['request', 'assignment', 'technician', 'customer'];
  actions  = ['create', 'update', 'delete'];

  private page$ = new BehaviorSubject<{ page: number; size: number }>({ page: 0, size: 20 });

  displayedColumns = ['created_at', 'actor', 'entity', 'action', 'details'];

  loading = false;
  result: PagedResult<AuditLog> = { items: [], total: 0, page: 0, pageSize: 20 };
  error: string | null = null;
  expanded: number | null = null;

  ngOnInit(): void {
    const filters$ = combineLatest([
      this.filterForm.controls.actor.valueChanges.pipe(debounceTime(300), startWith('')),
      this.filterForm.controls.entity.valueChanges.pipe(startWith('')),
      this.filterForm.controls.action.valueChanges.pipe(startWith('')),
    ]);

    combineLatest([filters$, this.page$])
      .pipe(
        tap(() => { this.loading = true; this.error = null; }),
        debounceTime(50),
        switchMap(([[actor, entity, action], paging]) =>
          this.dataService.getAuditLog(
            entity ?? '',
            action ?? '',
            actor ?? '',
            paging.page,
            paging.size,
          ).pipe(
            catchError(err => {
              this.error = String(err);
              return of<PagedResult<AuditLog>>({ items: [], total: 0, page: 0, pageSize: paging.size });
            }),
          ),
        ),
        tap(() => { this.loading = false; }),
      )
      .subscribe(r => { this.result = r; });
  }

  onPage(e: PageEvent): void {
    this.page$.next({ page: e.pageIndex, size: e.pageSize });
  }

  clearFilters(): void {
    this.filterForm.reset({ actor: '', entity: '', action: '' });
    this.page$.next({ page: 0, size: this.page$.value.size });
  }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.actor || v.entity || v.action);
  }

  toggleExpand(id: number): void {
    this.expanded = this.expanded === id ? null : id;
  }

  actionIcon(action: string): string {
    return { create: 'add_circle', update: 'edit', delete: 'delete' }[action] ?? 'history';
  }

  actionClass(action: string): string {
    return { create: 'action-create', update: 'action-update', delete: 'action-delete' }[action] ?? '';
  }
}
