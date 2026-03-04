import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  icon: string;
  key: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { icon: 'dashboard',  key: 'nav.dashboard',  path: '/dashboard'  },
    { icon: 'assignment', key: 'nav.requests',   path: '/requests'   },
    { icon: 'history',    key: 'nav.audit-log',  path: '/audit-log'  },
    { icon: 'settings',   key: 'nav.settings',   path: '/settings'   },
  ];
}
