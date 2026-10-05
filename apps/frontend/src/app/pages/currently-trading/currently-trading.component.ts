import { Component, OnDestroy } from '@angular/core';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';
import { CommonModule } from '@angular/common';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';
import { injectPositionQuery } from '../../core/queries/position.query';

@Component({
  selector: 'app-currently-trading-page',
  standalone: true,
  imports: [CommonModule, TokenCardComponent, NoDataComponent],
  templateUrl: './currently-trading.component.html',
  styleUrl: './currently-trading.component.scss',
})
export class CurrentlyTradingPageComponent
  extends BaseLayoutComponent
  implements OnDestroy
{
  positions = injectPositionQuery();

  constructor() {
    super();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  onCancelPosition(symbol: string) {
    console.log('onCancelPosition', symbol);
  }
}
