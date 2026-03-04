import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { icon: 'dashboard',         label: 'Dashboard',  path: '/dashboard'  },
    { icon: 'assignment',        label: 'Requests',   path: '/requests'   },
    { icon: 'history',           label: 'Audit Log',  path: '/audit-log'  },
    { icon: 'settings',          label: 'Settings',   path: '/settings'   },
  ];
}
