import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { filter, map, startWith } from 'rxjs/operators';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  requests:  'Requests',
  'audit-log': 'Audit Log',
  settings:  'Settings',
  new:       'New Request',
  edit:      'Edit Request',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AsyncPipe, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  theme  = inject(ThemeService);
  router = inject(Router);

  pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const url = this.router.url.split('?')[0];
      const segments = url.split('/').filter(Boolean);
      if (!segments.length) return 'Dashboard';
      const last = segments[segments.length - 1];
      if (!isNaN(Number(last)) && segments.length > 2) return 'Edit Request';
      return ROUTE_LABELS[last] ?? last;
    }),
  );

  breadcrumbs$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const url = this.router.url.split('?')[0];
      const segs = url.split('/').filter(Boolean);
      const crumbs: { label: string; path?: string }[] = [{ label: 'Home', path: '/' }];
      let path = '';
      segs.forEach((seg, i) => {
        path += '/' + seg;
        if (!isNaN(Number(seg))) return; // skip id segments
        crumbs.push({
          label: ROUTE_LABELS[seg] ?? seg,
          path: i < segs.length - 1 ? path : undefined,
        });
      });
      return crumbs;
    }),
  );
}
