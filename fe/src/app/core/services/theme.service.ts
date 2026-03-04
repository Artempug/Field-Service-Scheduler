import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);
  private _isDark = new BehaviorSubject<boolean>(
    localStorage.getItem('fss-theme') === 'dark'
  );
  isDark$ = this._isDark.asObservable();

  constructor() {
    this.apply(this._isDark.value);
  }

  toggle(): void {
    this.set(!this._isDark.value);
  }

  set(dark: boolean): void {
    this._isDark.next(dark);
    localStorage.setItem('fss-theme', dark ? 'dark' : 'light');
    this.apply(dark);
  }

  get isDark(): boolean {
    return this._isDark.value;
  }

  private apply(dark: boolean): void {
    const body = this.doc.body;
    if (dark) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  }
}
