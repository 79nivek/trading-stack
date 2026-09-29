import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Input,
  signal,
  ViewChild,
} from '@angular/core';
import { AccountService } from '../../../core/services/account.service';
import { ButtonComponent } from '../button/button.component';
import { TranslatePipe } from '@ngx-translate/core';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ToastService } from '../../../core/services/toast.service';
import { BackendApiService } from '../../../core/services/api/backend-api.service';
import { lastValueFrom } from 'rxjs';
import { Direction } from '@trading-stack/shared-dto';
import { calculatePnlAmount } from '@trading-stack/shared';

@Component({
  selector: 'app-chart-menu',
  standalone: true,
  imports: [DecimalPipe, ButtonComponent, TranslatePipe],
  templateUrl: './chart-menu.component.html',
  styleUrl: './chart-menu.component.scss',
})
export class ChartMenuComponent {
  @Input({ required: true }) symbol = '';

  @ViewChild('pricePopup') pricePopup?: ElementRef;

  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onClickOutside(event: Event) {
    if (this.showMenu()) {
      // If the click is inside the popup itself, do nothing
      if (this.pricePopup?.nativeElement?.contains(event.target)) {
        return;
      }
      this.showMenu.set(false);
    }
  }

  private accountService = inject(AccountService);
  private backendService = inject(BackendApiService);
  private toastService = inject(ToastService);

  position = computed(() => this.accountService.positions().get(this.symbol));

  entryPrice = computed(() => +(this.position()?.entryPrice || '0'));
  markPrice = computed(() => +(this.position()?.markPrice || '0'));

  isLong = computed(() => +(this.position()?.positionAmt || '0') > 0);

  priceAt = computed(() => {
    const targetPrice = this.selectedPrice().toString();
    const currentEntryPrice = this.position()?.entryPrice || '0';
    const currentPositionAmt = this.position()?.positionAmt || '0';
    const pnl = calculatePnlAmount({
      entryPrice: currentEntryPrice,
      positionAmt: currentPositionAmt,
      targetPrice: targetPrice,
    }).toFixed(2);
    return pnl;
  });

  showMenu = signal(false);

  selectedPrice = signal<number>(0);

  takeProfitMutate = injectMutation(() => ({
    mutationFn: () =>
      lastValueFrom(
        this.backendService.setOrderTakeProfit({
          symbol: this.symbol,
          price: this.selectedPrice().toString(),
          direction: this.isLong() ? Direction.LONG : Direction.SHORT,
        }),
      ),
    onSuccess: () => {
      this.toastService.show(`Set Take Profit successfully`, 'success', 5000);
    },
    onError: (error) => {
      this.toastService.show(`Set Take Profit failed`, 'danger');
    },
  }));

  stopLossMutate = injectMutation(() => ({
    mutationFn: () =>
      lastValueFrom(
        this.backendService.setOrderStopLoss({
          symbol: this.symbol,
          price: this.selectedPrice().toString(),
          direction: this.isLong() ? Direction.LONG : Direction.SHORT,
        }),
      ),
    onSuccess: () => {
      this.toastService.show(`Set Stop Loss successfully`, 'success', 5000);
    },
    onError: (error) => {
      this.toastService.show(`Set Stop Loss failed`, 'danger');
    },
  }));

  constructor() {
    //
  }

  public setPoint(value: number | string) {
    const numValue = +value;
    if (numValue && numValue === this.selectedPrice()) return;
    if (this.showMenu()) {
      this.selectedPrice.set(numValue);
    } else {
      this.showMenu.set(true);
      this.selectedPrice.set(numValue);
    }
  }

  executeOrder(intendedType: 'TP' | 'SL') {
    const isLong = this.isLong();
    const price = this.selectedPrice();
    const mark = this.markPrice();
    const entry = this.entryPrice();
    // 1. Xác định rõ vùng giá hiện tại thuộc về Chốt lời hay Cắt lỗ
    const isTPZone = isLong
      ? price > mark && price > entry
      : price < mark && price < entry;
    const isSLZone = isLong
      ? price < mark && price < entry
      : price > mark && price > entry;
    // 2. Tự động điều hướng hàm thực thi
    if (isTPZone) {
      this.takeProfitMutate.mutate();
    } else if (isSLZone) {
      this.stopLossMutate.mutate();
    } else {
      // 3. Fallback cho vùng giá "nhập nhằng" (kẹp giữa giá Mark và giá Entry)
      // Giữ nguyên fallback giống hệt như logic gốc của bạn
      if (intendedType === 'TP') {
        this.stopLossMutate.mutate();
      } else {
        this.takeProfitMutate.mutate();
      }
    }
  }
}
