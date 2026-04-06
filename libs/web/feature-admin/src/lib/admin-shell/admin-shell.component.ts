import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Trophy,
  Settings,
  LogOut,
  Menu,
} from 'lucide-angular';

@Component({
  selector: 'ds-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './admin-shell.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})
export class AdminShellComponent {
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Trophy = Trophy;
  readonly Settings = Settings;
  readonly LogOut = LogOut;
  readonly Menu = Menu;

  menuItems = [
    { label: 'Tổng quan', icon: LayoutDashboard, link: '/admin', exact: true },
    { label: 'Thành viên', icon: Users, link: '/admin/members' },
    { label: 'Mùa giải', icon: Trophy, link: '/admin/seasons' },
    { label: 'Cấu hình', icon: Settings, link: '/admin/settings' },
  ];
}
