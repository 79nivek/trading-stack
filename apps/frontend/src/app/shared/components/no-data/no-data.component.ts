import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-no-data',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './no-data.component.html',
})
export class NoDataComponent {
  @Input() showNoData = false;
}
