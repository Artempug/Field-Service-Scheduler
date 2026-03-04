import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { switchMap, of, catchError, Observable, map, startWith } from 'rxjs';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ServiceRequest, RequestStatus } from '../../../core/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PriorityLabelPipe } from '../../../shared/pipes/priority-label.pipe';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    AsyncPipe, NgClass, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule,
    TranslatePipe, PriorityLabelPipe,
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
})
export class RequestFormComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private data    = inject(DataService);
  private notify  = inject(NotificationService);

  editId: number | null = null;
  isEdit = false;
  loading = false;
  saving  = false;
  loadError: string | null = null;

  zones$      = this.data.getZones();
  workTypes$  = this.data.getWorkTypes();
  customers$  = this.data.getCustomers();
  technicians$ = this.data.getTechnicians(true);

  statuses: { value: RequestStatus; label: string }[] = [
    { value: 'new',         label: 'New' },
    { value: 'scheduled',   label: 'Scheduled' },
    { value: 'en_route',    label: 'En Route' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done',        label: 'Done' },
    { value: 'cancelled',   label: 'Cancelled' },
  ];

  form = this.fb.group({
    title:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description:  [''],
    customer_id:  [null as number | null, Validators.required],
    work_type_id: [null as number | null, Validators.required],
    zone_id:      [null as number | null],
    priority:     [3 as number, Validators.required],
    status:       ['new' as RequestStatus, Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.isEdit = true;
      this.loadRecord(this.editId);
    }
  }

  private loadRecord(id: number): void {
    this.loading = true;
    this.data.getRequest(id).subscribe({
      next: req => {
        this.loading = false;
        if (!req) { this.loadError = 'Request not found'; return; }
        this.form.patchValue({
          title:        req.title,
          description:  req.description ?? '',
          customer_id:  req.customer_id,
          work_type_id: req.work_type_id,
          zone_id:      req.zone_id,
          priority:     req.priority,
          status:       req.status,
        });
      },
      error: err => {
        this.loading = false;
        this.loadError = String(err);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;

    const raw = this.form.getRawValue();
    const payload: Partial<ServiceRequest> = {
      title:        raw.title ?? '',
      description:  raw.description || null,
      customer_id:  raw.customer_id!,
      work_type_id: raw.work_type_id!,
      zone_id:      raw.zone_id ?? null,
      priority:     raw.priority as 1|2|3|4|5,
      status:       raw.status as RequestStatus,
    };

    const op$ = this.isEdit
      ? this.data.updateRequest(this.editId!, payload)
      : this.data.createRequest(payload);

    op$.subscribe({
      next: () => {
        this.saving = false;
        this.notify.success(this.isEdit ? 'Request updated.' : 'Request created.');
        this.router.navigate(['/requests']);
      },
      error: err => {
        this.saving = false;
        this.notify.error(String(err));
      },
    });
  }

  fieldError(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required'])  return 'This field is required.';
    if (c.errors?.['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors?.['maxlength']) return `Maximum ${c.errors['maxlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }
}
