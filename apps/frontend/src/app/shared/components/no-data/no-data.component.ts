import { Component, Input } from '@angular/core';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-no-data',
  standalone: true,
  imports: [TranslatePipe, TranslateDirective],
  templateUrl: './no-data.component.html',
})
export class NoDataComponent {
  @Input() showNoData = false;
}
