import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  injectSetAlgoTPMutation,
  injectSetAlgoSLMutation,
  // injectOrderQuery,
  // injectAlgoOrderQuery,
} from '../../../core/queries/order.query';
import { Direction } from '@trading-stack/shared-dto';
import { calculatePnlAmount } from '@trading-stack/shared';
import {
  injectMarkedPriceQuery,
  injectMarkedPriceMutation,
} from '../../../core/queries/marked-price.query';
import { ExchangeInfoService } from './../../../core/services/exchange.service';
import { injectPositionQuery } from '../../../core/queries/position.query';
import { ChartDataService } from '../../../core/services/chart-data.service';
// import { injectPositionQuery } from '../../../core/queries/position.query';
// import { injectPositionQuery } from '../../../core/queries/position.query';

@Component({
  selector: 'app-chart-menu',
  standalone: true,
  imports: [ButtonComponent, TranslatePipe, CommonModule],
  templateUrl: './chart-menu.component.html',
  styleUrl: './chart-menu.component.scss',
})
export class ChartMenuComponent {
  symbol = input<string>('');

  @ViewChild('pricePopup') pricePopup?: ElementRef;
  @Output() onClose = new EventEmitter<void>();

  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onClickOutside(event: Event) {
    if (this.showMenu()) {
      if (this.pricePopup?.nativeElement?.contains(event.target)) {
        return;
      }
      this.showMenu.set(false);
      this.onClose.emit();
    }
  }

  private positionQuery = injectPositionQuery();

  private setTakeProfitMutation = injectSetAlgoTPMutation();
  private setStopLossMutation = injectSetAlgoSLMutation();

  private exchangeService = inject(ExchangeInfoService);
  private chartDataService = inject(ChartDataService);

  position = computed(() => {
    return this.positionQuery.data()?.get(this.symbol() || '');
  });

  realtimePosition = this.chartDataService.registerSymbolRealtime(this.symbol);

  priceAt = computed(() => {
    const targetPrice = this.selectedPrice();
    const entryPrice = this.position()?.entryPrice || 0;

    const positionAmt = this.position()?.positionAmt || 0;

    return calculatePnlAmount({
      entryPrice: String(entryPrice),
      positionAmt: String(positionAmt),
      targetPrice: String(targetPrice),
    });
  });

  pnl = computed(() => this.priceAt() - (this.position()?.fee || 0));

  showMenu = signal(false);

  selectedPrice = signal<number>(0);

  addMarkedPriceMutation = injectMarkedPriceMutation(this.symbol);

  markedPriceQuery = injectMarkedPriceQuery(this.symbol);

  constructor() {
    //
  }

  public async setPoint(value: number | string) {
    const numValue = await this.exchangeService.formatPrice(
      +value,
      this.symbol() || '',
    );
    if (numValue && numValue === this.selectedPrice()) return;
    if (this.showMenu()) {
      this.selectedPrice.set(numValue);
    } else {
      this.showMenu.set(true);
      this.selectedPrice.set(numValue);
    }
  }

  executeOrder(intendedType: 'TP' | 'SL') {
    const pos = this.position();

    if (!pos) return;

    const selectedPrice = this.selectedPrice();
    const mark = +(this.realtimePosition()?.markPrice || '0');
    const entry = +pos.entryPrice || 0;
    const isLong = pos.isLong;

    const symbol = this.symbol() || '';

    const params = {
      symbol: symbol,
      price: selectedPrice.toString(),
      direction: isLong ? Direction.LONG : Direction.SHORT,
      quantity: pos.positionAmt.toString() || '0',
    };

    // 1. Xác định rõ vùng giá hiện tại thuộc về Chốt lời hay Cắt lỗ
    const isTPZone = isLong
      ? selectedPrice > mark && selectedPrice > entry
      : selectedPrice < mark && selectedPrice < entry;
    const isSLZone = isLong
      ? selectedPrice < mark && selectedPrice < entry
      : selectedPrice > mark && selectedPrice > entry;
    // 2. Tự động điều hướng hàm thực thi
    if (isTPZone) {
      this.setTakeProfitMutation.mutate(params);
    } else if (isSLZone) {
      this.setStopLossMutation.mutate(params);
    } else {
      // 3. Fallback cho vùng giá "nhập nhằng" (kẹp giữa giá Mark và giá Entry)
      // Giữ nguyên fallback giống hệt như logic gốc của bạn
      if (intendedType === 'TP') {
        this.setStopLossMutation.mutate(params);
      } else {
        this.setTakeProfitMutation.mutate(params);
      }
    }
  }

  addMarkedPrice() {
    const sym = this.symbol();
    if (!sym || !this.selectedPrice()) return;

    this.addMarkedPriceMutation.mutate({
      symbol: sym,
      price: this.selectedPrice().toString(),
      title: 'heloo',
    });
  }
}
