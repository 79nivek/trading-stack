import { Component, inject, OnInit } from '@angular/core';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { FuturesWebsocketService } from '../../core/services/futures-websocket.service';

@Component({
  selector: 'app-currently-trading-page',
  standalone: true,
  imports: [TranslatePipe, TranslateDirective],
  templateUrl: './currently-trading.component.html',
  styleUrl: './currently-trading.component.scss'
})
export class CurrentlyTradingPageComponent {
  private readonly futuresWebsocketService = inject(FuturesWebsocketService);

}
