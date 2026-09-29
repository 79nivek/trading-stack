import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BackendApiService } from './api/backend-api.service';
import { Order, Position } from '@trading-stack/shared-dto';
import { SecretKeyService } from './secret-key.service';
import { FuturesWebsocketService } from './api/futures-ws.service';
import { interval, Subscription } from 'rxjs';
import { DebounceEvent } from '../../shared/classes/debounce-event';

@Injectable({ providedIn: 'root' })
export class AccountService implements OnDestroy {
  private readonly backendService = inject(BackendApiService);
  private readonly secretKeyService = inject(SecretKeyService);
  private futureWs = inject(FuturesWebsocketService);

  private subscriptions = new Subscription();

  private debounceInfo = new DebounceEvent(1500, () => {
    this._fetchInfo();
  });
  private debounceOrder = new DebounceEvent(1500, () => {
    this._fetchOrders();
  });

  public futureBalance = signal(0);

  public realizedPnlToday = signal(0);

  public unrealizedPnl = signal<number>(0);

  public positions = signal(new Map<string, Position>());

  public orders = signal(new Map<string, Order[]>());

  constructor() {
    effect(() => {
      const token = this.secretKeyService.token;
      if (token) {
        this.fetchInfo();
      }
    });
  }

  fetchInfo() {
    this.debounceInfo.emit();
  }

  private _fetchInfo() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    this.backendService.getFuturesAccountInfo().subscribe({
      next: (account) => {
        this.futureBalance.set(account.futureBalance);
        this.realizedPnlToday.set(account.realizedPnlToday);
        this.unrealizedPnl.set(account.unrealizedPnl);
      },
    });

    this.fetchPositions();
  }

  fetchPositions() {
    this.backendService.getFuturesPositions().subscribe({
      next: (positions) => {
        this.positions.set(
          positions.reduce((acc, position) => {
            acc.set(position.symbol, position);
            return acc;
          }, new Map<string, Position>()),
        );

        if (positions.length > 0) {
          this._fetchOrders();
          this.watchUnrealizedPnl();
        }
      },
    });
  }

  fetchOrders() {
    this.debounceOrder.emit();
  }

  private _fetchOrders() {
    this.backendService.getFuturesOrders().subscribe({
      next: (orders) => {
        const orderMap = new Map<string, Order[]>();
        orders.forEach((order) => {
          if (order.symbol) {
            const oldOrder = orderMap.get(order.symbol);
            if (oldOrder) {
              oldOrder.push(order);
              orderMap.set(order.symbol, oldOrder);
            } else {
              orderMap.set(order.symbol, [order]);
            }
          }
        });
        this.orders.set(orderMap);
      },
    });
  }

  watchUnrealizedPnl() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    if (this.positions().size === 0) {
      this.unrealizedPnl.set(0);
      return;
    }

    this.positions().forEach((position) => {
      const amt = parseFloat(position.positionAmt || '0');
      if (amt === 0) return; // Skip closed positions

      const sub = this.futureWs.register(position.symbol).subscribe({
        next: (tick) => {
          const entry = parseFloat(position.entryPrice || '0');
          const currentPrice = tick.close;

          if (entry > 0) {
            const displayPnl = amt * (currentPrice - entry);
            const key = position.symbol;

            this.positions.update((currentMap) => {
              const newMap = new Map(currentMap);
              const oldPos = newMap.get(key);
              if (oldPos) {
                newMap.set(key, {
                  ...oldPos,
                  unRealizedProfit: displayPnl.toString(),
                });
              }
              return newMap;
            });
          }
        },
      });
      this.subscriptions.add(sub);
    });

    this.subscriptions.add(
      interval(1000).subscribe(() => {
        let totalUnrealized = 0;
        this.positions().forEach((position) => {
          totalUnrealized += parseFloat(position.unRealizedProfit || '0');
        });

        this.unrealizedPnl.set(totalUnrealized);
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.debounceInfo.unsub();
    this.debounceOrder.unsub();
  }
}
