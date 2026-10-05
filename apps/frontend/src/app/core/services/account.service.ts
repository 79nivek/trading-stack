import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BackendApiService } from './api/backend-api.service';
import { AlgoOrder, Order, Position } from '@trading-stack/shared-dto';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { DebounceEvent } from '../../shared/classes/debounce-event';
import { PageTitleStrategy } from '../strategies/page-title.strategy';
import { masterTokenStorageInstance } from './storage.service';
import { FuturesWebsocketService } from './api/futures-ws.service';

@Injectable({ providedIn: 'root' })
export class AccountService implements OnDestroy {
  private readonly backendService = inject(BackendApiService);
  private readonly futureWs = inject(FuturesWebsocketService);
  private readonly pageTitle = inject(PageTitleStrategy);

  private wsSubscriptions = new Subscription();
  private pnlIntervalSub?: Subscription;

  private readonly debounceInfo = new DebounceEvent(1500, () =>
    this._fetchInfo(),
  );
  private readonly debounceOrder = new DebounceEvent(1500, () =>
    this._fetchOrders(),
  );

  public readonly futureBalance = signal(0);
  public readonly realizedPnlToday = signal(0);
  public readonly $unrealizedPnl = new BehaviorSubject<number>(0);
  public readonly positions = signal(new Map<string, Position>());
  public readonly orders = signal(new Map<string, Order[]>());
  public readonly algoOrders = signal(new Map<string, AlgoOrder[]>());

  constructor() {
    effect(() => {
      const token = masterTokenStorageInstance.get();
      if (token) {
        this.fetchInfo();
      }
    });
  }

  fetchInfo() {
    this.debounceInfo.emit();
  }

  private _fetchInfo() {
    this.backendService.getFuturesAccountInfo().subscribe({
      next: (account) => {
        this.futureBalance.set(account.futureBalance);
        this.realizedPnlToday.set(account.realizedPnlToday);
        this.$unrealizedPnl.next(account.unrealizedPnl);
        this.pageTitle.setTitle(account.unrealizedPnl);
      },
    });

    this.fetchPositions();
  }

  fetchPositions() {
    this.backendService.getFuturesPositions().subscribe({
      next: (positions) => {
        this.positions.set(new Map(positions.map((pos) => [pos.symbol, pos])));

        if (positions.length > 0) {
          this._fetchOrders();
          this.watchUnrealizedPnl();
        } else {
          this.stopWatchingPnl();
          this.$unrealizedPnl.next(0);
          this.pageTitle.setTitle(0);
        }
      },
    });
  }

  fetchOrders() {
    this.debounceOrder.emit();
  }

  private _fetchOrders() {
    this.backendService.getFuturesOrders().subscribe({
      next: ({ orders, algoOrders }) => {
        const algoOrderMap = new Map<string, AlgoOrder[]>();
        for (const order of algoOrders) {
          if (!order.symbol) continue;
          if (!algoOrderMap.has(order.symbol))
            algoOrderMap.set(order.symbol, []);
          algoOrderMap.get(order.symbol)!.push(order);
        }
        this.algoOrders.set(algoOrderMap);

        const orderMap = new Map<string, Order[]>();
        for (const order of orders) {
          if (!order.symbol) continue;
          if (!orderMap.has(order.symbol)) orderMap.set(order.symbol, []);
          orderMap.get(order.symbol)!.push(order);
        }
        this.orders.set(orderMap);
      },
    });
  }

  watchUnrealizedPnl() {
    this.stopWatchingPnl(); // Clear previous websockets and interval

    const currentPositions = this.positions();
    if (currentPositions.size === 0) return;

    for (const [symbol, position] of currentPositions) {
      const amt = parseFloat(position.positionAmt || '0');
      const entry = parseFloat(position.entryPrice || '0');

      if (amt === 0 || entry <= 0) continue; // Skip invalid or closed positions

      const sub = this.futureWs.register(symbol).subscribe({
        next: (tick) => {
          const currentPrice = tick.close;
          const displayPnl = amt * (currentPrice - entry);

          this.positions.update((currentMap) => {
            const oldPos = currentMap.get(symbol);
            if (!oldPos) return currentMap;

            const newMap = new Map(currentMap);
            newMap.set(symbol, {
              ...oldPos,
              unRealizedProfit: displayPnl.toString(),
              markPrice: currentPrice.toString(),
            });
            return newMap;
          });
        },
      });
      this.wsSubscriptions.add(sub);
    }

    // Interval to emit total PnL
    this.pnlIntervalSub = interval(1000).subscribe(() => {
      let totalUnrealized = 0;
      for (const position of this.positions().values()) {
        totalUnrealized += parseFloat(position.unRealizedProfit || '0');
      }
      this.$unrealizedPnl.next(totalUnrealized);
      this.pageTitle.setTitle(totalUnrealized);
    });
  }

  private stopWatchingPnl() {
    this.wsSubscriptions.unsubscribe();
    this.wsSubscriptions = new Subscription();

    if (this.pnlIntervalSub) {
      this.pnlIntervalSub.unsubscribe();
      this.pnlIntervalSub = undefined;
    }
  }

  ngOnDestroy() {
    this.stopWatchingPnl();
    this.debounceInfo.unsub();
    this.debounceOrder.unsub();
  }
}
