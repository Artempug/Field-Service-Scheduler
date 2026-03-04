import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard — FSS',
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./pages/requests/requests-list/requests-list.component').then(
            m => m.RequestsListComponent,
          ),
        title: 'Requests — FSS',
      },
      {
        path: 'requests/new',
        loadComponent: () =>
          import('./pages/requests/request-form/request-form.component').then(
            m => m.RequestFormComponent,
          ),
        title: 'New Request — FSS',
      },
      {
        path: 'requests/:id/edit',
        loadComponent: () =>
          import('./pages/requests/request-form/request-form.component').then(
            m => m.RequestFormComponent,
          ),
        title: 'Edit Request — FSS',
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./pages/audit-log/audit-log.component').then(m => m.AuditLogComponent),
        title: 'Audit Log — FSS',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        title: 'Settings — FSS',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
