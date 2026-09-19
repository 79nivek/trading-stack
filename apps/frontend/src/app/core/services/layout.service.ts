import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private sectionSource = new BehaviorSubject<TemplateRef<any> | null>(null);
  section$ = this.sectionSource.asObservable();

  setSection(template: TemplateRef<any> | null) {
    this.sectionSource.next(template);
  }
}
