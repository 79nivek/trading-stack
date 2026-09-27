import { Component, inject, OnDestroy } from '@angular/core';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';
import { CommonModule } from '@angular/common';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-currently-trading-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateDirective,
    TranslatePipe,
    TokenCardComponent,
    NoDataComponent,
  ],
  templateUrl: './currently-trading.component.html',
  styleUrl: './currently-trading.component.scss',
})
export class CurrentlyTradingPageComponent
  extends BaseLayoutComponent
  implements OnDestroy
{
  public accountServ = inject(AccountService);

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
