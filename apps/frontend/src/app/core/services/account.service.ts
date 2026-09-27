import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BackendApiService } from './api/backend-api.service';
import { Position } from '@trading-stack/shared-dto';
import { SecretKeyService } from './secret-key.service';
import { FuturesWebsocketService } from './api/futures-ws.service';
import { interval, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccountService implements OnDestroy {
  private readonly backendService = inject(BackendApiService);
  private readonly secretKeyService = inject(SecretKeyService);
  private futureWs = inject(FuturesWebsocketService);

  private subscriptions = new Subscription();

  public futureBalance = signal(0);

  public realizedPnlToday = signal(0);

  public unrealizedPnl = signal<number>(0);

  public currentPositions = signal(new Map<string, Position>());

  constructor() {
    effect(() => {
      const token = this.secretKeyService.token;
      if (token) {
        this.fetchInfo();
      }
    });
  }

  fetchInfo() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    this.backendService.getFuturesAccountInfo().subscribe({
      next: (account) => {
        this.futureBalance.set(account.futureBalance);
        this.realizedPnlToday.set(account.realizedPnlToday);
        this.unrealizedPnl.set(account.unrealizedPnl);

        this.currentPositions.set(
          account.positions.reduce((acc, position) => {
            acc.set(position.symbol, position);
            return acc;
          }, new Map<string, Position>()),
        );

        this.watchUnrealizedPnl();
      },
    });
  }

  watchUnrealizedPnl() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    if (this.currentPositions().size === 0) {
      this.unrealizedPnl.set(0);
      return;
    }

    this.currentPositions().forEach((position) => {
      const amt = parseFloat(position.positionAmt || '0');
      if (amt === 0) return; // Skip closed positions

      const sub = this.futureWs.register(position.symbol).subscribe({
        next: (tick) => {
          const entry = parseFloat(position.entryPrice || '0');
          const currentPrice = tick.close;

          if (entry > 0) {
            const displayPnl = amt * (currentPrice - entry);
            const key = position.symbol;

            this.currentPositions.update((currentMap) => {
              currentMap.set(key, {
                ...position,
                unRealizedProfit: displayPnl.toString(),
              });
              return currentMap;
            });
          }
        },
      });
      this.subscriptions.add(sub);
    });

    this.subscriptions.add(
      interval(1000).subscribe(() => {
        let totalUnrealized = 0;
        this.currentPositions().forEach((position) => {
          totalUnrealized += parseFloat(position.unRealizedProfit || '0');
        });

        this.unrealizedPnl.set(totalUnrealized);
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
