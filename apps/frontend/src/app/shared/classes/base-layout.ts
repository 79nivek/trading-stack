import { Directive, ViewChild, TemplateRef, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { LayoutService } from '../../core/services/layout.service';

@Directive()
export abstract class BaseLayoutComponent implements AfterViewInit, OnDestroy {
  protected layoutService = inject(LayoutService);
  @ViewChild('HeaderSection') mySection!: TemplateRef<any>;

  ngAfterViewInit() {
    if (this.mySection) {
      setTimeout(() => {
        this.layoutService.setSection(this.mySection);
      });
    }
  }

  ngOnDestroy() {
    setTimeout(() => {
      this.layoutService.setSection(null);
    });
  }
}
