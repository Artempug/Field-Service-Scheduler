import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { combineLatest } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

const ROUTE_KEYS: Record<string, string> = {
  dashboard:   'page.dashboard',
  requests:    'page.requests',
  'audit-log': 'page.audit-log',
  settings:    'page.settings',
  new:         'page.new-request',
  edit:        'page.edit-request',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AsyncPipe, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  theme   = inject(ThemeService);
  langSvc = inject(LanguageService);
  router  = inject(Router);

  private route$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url.split('?')[0]),
  );

  pageTitle$ = combineLatest([this.route$, this.langSvc.lang$]).pipe(
    map(([url]) => {
      const segments = url.split('/').filter(Boolean);
      if (!segments.length) return this.langSvc.t('page.dashboard');
      const last = segments[segments.length - 1];
      if (!isNaN(Number(last)) && segments.length > 2) return this.langSvc.t('page.edit-request');
      const key = ROUTE_KEYS[last];
      return key ? this.langSvc.t(key) : last;
    }),
  );

  breadcrumbs$ = combineLatest([this.route$, this.langSvc.lang$]).pipe(
    map(([url]) => {
      const segs = url.split('/').filter(Boolean);
      const crumbs: { label: string; path?: string }[] = [
        { label: this.langSvc.t('page.home'), path: '/' },
      ];
      let path = '';
      segs.forEach((seg, i) => {
        path += '/' + seg;
        if (!isNaN(Number(seg))) return;
        const key = ROUTE_KEYS[seg];
        crumbs.push({
          label: key ? this.langSvc.t(key) : seg,
          path: i < segs.length - 1 ? path : undefined,
        });
      });
      return crumbs;
    }),
  );
}
