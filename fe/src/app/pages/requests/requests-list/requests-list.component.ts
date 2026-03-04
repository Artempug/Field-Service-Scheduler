import {
  Component, inject, OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { AsyncPipe, DatePipe, NgClass, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import {
  BehaviorSubject, Subject, combineLatest, switchMap, tap, catchError, of,
} from 'rxjs';
import { debounceTime, startWith, takeUntil } from 'rxjs/operators';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ServiceRequest, RequestFilters, PagedResult, RequestStatus } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { PriorityLabelPipe } from '../../../shared/pipes/priority-label.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-requests-list',
  standalone: true,
  imports: [
    AsyncPipe, DatePipe, NgClass, SlicePipe, RouterLink, ReactiveFormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatProgressBarModule, MatDialogModule,
    StatusLabelPipe, PriorityLabelPipe,
  ],
  templateUrl: './requests-list.component.html',
  styleUrl: './requests-list.component.scss',
})
export class RequestsListComponent implements OnInit, OnDestroy {
  private dataService  = inject(DataService);
  private notify       = inject(NotificationService);
  private dialog       = inject(MatDialog);
  private destroy$     = new Subject<void>();

  filterForm = new FormGroup({
    search:      new FormControl(''),
    status:      new FormControl<RequestStatus | ''>(''),
    priority:    new FormControl<number | ''>(''),
    zone_id:     new FormControl<number | ''>(''),
    work_type_id: new FormControl<number | ''>(''),
  });

  statuses: RequestStatus[] = ['new', 'scheduled', 'en_route', 'in_progress', 'done', 'cancelled'];
  priorities = [1, 2, 3, 4, 5];

  zones$      = this.dataService.getZones();
  workTypes$  = this.dataService.getWorkTypes();

  private sort$  = new BehaviorSubject<Sort>({ active: 'id', direction: 'desc' });
  private page$  = new BehaviorSubject<{ page: number; size: number }>({ page: 0, size: 10 });

  displayedColumns = ['id', 'title', 'customer', 'zone', 'priority', 'status', 'updated_at', 'actions'];

  loading  = false;
  result: PagedResult<ServiceRequest> = { items: [], total: 0, page: 0, pageSize: 10 };
  error: string | null = null;

  ngOnInit(): void {
    const search$ = this.filterForm.controls.search.valueChanges.pipe(
      debounceTime(350),
      startWith(''),
    );

    const filters$ = combineLatest([
      search$,
      this.filterForm.controls.status.valueChanges.pipe(startWith('')),
      this.filterForm.controls.priority.valueChanges.pipe(startWith('')),
      this.filterForm.controls.zone_id.valueChanges.pipe(startWith('')),
      this.filterForm.controls.work_type_id.valueChanges.pipe(startWith('')),
    ]);

    combineLatest([filters$, this.sort$, this.page$])
      .pipe(
        tap(() => { this.loading = true; this.error = null; }),
        debounceTime(50),
        switchMap(([[search, status, priority, zone_id, work_type_id], sort, paging]) => {
          const filters: RequestFilters = {
            search: search ?? '',
            status: (status ?? '') as RequestStatus | '',
            priority: (priority ?? '') as number | '',
            zone_id: (zone_id ?? '') as number | '',
            work_type_id: (work_type_id ?? '') as number | '',
          };
          return this.dataService.getRequests(
            filters,
            sort.active || 'id',
            (sort.direction || 'desc') as 'asc' | 'desc',
            paging.page,
            paging.size,
          ).pipe(
            catchError(err => {
              this.error = String(err);
              return of<PagedResult<ServiceRequest>>({ items: [], total: 0, page: 0, pageSize: paging.size });
            }),
          );
        }),
        tap(() => { this.loading = false; }),
        takeUntil(this.destroy$),
      )
      .subscribe(r => { this.result = r; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSort(sort: Sort): void {
    this.sort$.next(sort);
    this.page$.next({ ...this.page$.value, page: 0 });
  }

  onPage(e: PageEvent): void {
    this.page$.next({ page: e.pageIndex, size: e.pageSize });
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '', status: '', priority: '', zone_id: '', work_type_id: '',
    });
    this.page$.next({ page: 0, size: this.page$.value.size });
  }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.search || v.status || v.priority || v.zone_id || v.work_type_id);
  }

  async deleteRequest(req: ServiceRequest): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete Request',
        message: `Are you sure you want to delete "${req.title}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
    });

    const confirmed = await ref.afterClosed().toPromise();
    if (!confirmed) return;

    this.dataService.deleteRequest(req.id).subscribe({
      next: async () => {
        const undo = await this.notify.undoable(`Request "${req.title}" deleted`);
        if (undo) {
          this.dataService.restoreRequest(req);
          this.notify.info('Request restored.');
          this.reload();
        } else {
          this.reload();
        }
      },
      error: err => this.notify.error(String(err)),
    });
  }

  private reload(): void {
    this.sort$.next({ ...this.sort$.value });
  }
}
