import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy implements OnDestroy {
  private title = inject(Title);
  private translate = inject(TranslateService);
  private langSub: Subscription | null = null;
  private currentTranslation = '';

  public pageTitle = signal<string>('');

  override updateTitle(routerState: RouterStateSnapshot): void {
    const titleKey = this.buildTitle(routerState);

    if (this.langSub) {
      this.langSub.unsubscribe();
    }

    if (titleKey) {
      this.pageTitle.set(titleKey);

      // Update document title instantly
      this.currentTranslation = this.translate.instant(titleKey);
      this.title.setTitle(`${this.currentTranslation}`);

      // Update document title on language change
      this.langSub = this.translate.onLangChange.subscribe(() => {
        this.currentTranslation = this.translate.instant(titleKey);
        this.setTitle();
      });
    } else {
      this.currentTranslation = 'Trading Stack';
    }

    this.setTitle();
  }

  setTitle(pnl?: number) {
    if (pnl !== undefined && pnl !== null) {
      this.setFavicon(pnl);
      this.title.setTitle(`${pnl.toFixed(2)} ${this.currentTranslation}`);
    } else {
      this.setFavicon(undefined);
      this.title.setTitle(`${this.currentTranslation}`);
    }
  }

  setFavicon(pnl?: number) {
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (pnl !== undefined && pnl !== null) {
      favicon.href = pnl >= 0 ? '/public/favicon.green.ico' : '/public/favicon.red.ico';
    } else {
      favicon.href = '/public/favicon.ico';
    }
  }

  ngOnDestroy() {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }
}
