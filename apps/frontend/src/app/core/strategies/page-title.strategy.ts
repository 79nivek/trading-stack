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

  public pageTitle = signal<string>('');

  override updateTitle(routerState: RouterStateSnapshot): void {
    const titleKey = this.buildTitle(routerState);

    if (this.langSub) {
      this.langSub.unsubscribe();
    }

    if (titleKey) {
      this.pageTitle.set(titleKey);

      // Update document title instantly
      const currentTranslation = this.translate.instant(titleKey);
      this.title.setTitle(`Trading Stack - ${currentTranslation}`);

      // Update document title on language change
      this.langSub = this.translate.onLangChange.subscribe(() => {
        const newTitle = this.translate.instant(titleKey);
        this.title.setTitle(`Trading Stack - ${newTitle}`);
      });
    } else {
      this.title.setTitle('Trading Stack');
      this.pageTitle.set('');
    }
  }

  ngOnDestroy() {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }
}
