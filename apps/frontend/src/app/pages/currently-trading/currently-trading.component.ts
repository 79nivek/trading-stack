import { Component } from '@angular/core';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';

@Component({
  selector: 'app-currently-trading-page',
  standalone: true,
  imports: [TranslatePipe, TranslateDirective],
  templateUrl: './currently-trading.component.html',
  styleUrl: './currently-trading.component.scss',
})
export class CurrentlyTradingPageComponent {}
