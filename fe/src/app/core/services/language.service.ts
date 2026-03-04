import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Lang, TRANSLATIONS } from '../i18n/translations';

const STORAGE_KEY = 'fss-language';
const DEFAULT: Lang = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _lang = new BehaviorSubject<Lang>(this._load());
  readonly lang$ = this._lang.asObservable();

  get current(): Lang { return this._lang.value; }

  setLanguage(lang: string): void {
    const l = (['en', 'uk', 'de'].includes(lang) ? lang : DEFAULT) as Lang;
    localStorage.setItem(STORAGE_KEY, l);
    this._lang.next(l);
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this._lang.value] ?? TRANSLATIONS[key]?.['en'] ?? key;
  }

  private _load(): Lang {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (['en', 'uk', 'de'].includes(saved ?? '') ? saved : DEFAULT) as Lang;
  }
}
