import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BackendApiService } from './api/backend-api.service';
import { AccountInfoResponse, Position } from '@trading-stack/shared-dto';
import { SecretKeyService } from './secret-key.service';
import { FuturesWebsocketService } from './api/futures-ws.service';
import { debounceTime, interval, of, Subscription, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccountService implements OnDestroy {
  private readonly backendService = inject(BackendApiService);
  private readonly secretKeyService = inject(SecretKeyService);
  private futureWs = inject(FuturesWebsocketService);

  private subscriptions = new Subscription();

  public accountData = signal<
    | (Omit<AccountInfoResponse, 'positions'> & {
        unRealizedPnls: string;
      })
    | null
  >(null);

  private currentPositions: Record<string, Position> = {};

  constructor() {
    effect(() => {
      const token = this.secretKeyService.token;
      if (token) {
        this.fetchInfo();
      }
    });
  }

  fetchInfo() {
    // debound 2s tranh call ham lien tuc

    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    of(null)
      .pipe(
        debounceTime(2000),
        switchMap(() => this.backendService.getFuturesAccountInfo()),
      )
      .subscribe({
        next: (account) => {
          this.accountData.set({
            futureBalance: account.futureBalance,
            unrealizedPnl: account.unrealizedPnl,
            realizedPnlToday: account.realizedPnlToday,
            unRealizedPnls: '',
          });

          this.currentPositions = (account.positions || []).reduce(
            (acc, position) => {
              acc[position.symbol] = position;
              return acc;
            },
            {} as Record<string, Position>,
          );
          this.watchUnrealizedPnl();
        },
      });
  }

  watchUnrealizedPnl() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    if (Object.keys(this.currentPositions).length === 0) return;

    const pnlMap: Record<string, number> = {};

    Object.values(this.currentPositions).forEach((position) => {
      const amt = parseFloat(position.positionAmt || '0');
      if (amt === 0) return; // Skip closed positions

      const sub = this.futureWs.register(position.symbol).subscribe({
        next: (tick) => {
          const entry = parseFloat(position.entryPrice || '0');
          const currentPrice = tick.close;

          if (entry > 0) {
            const displayPnl = amt * (currentPrice - entry);
            const key = position.symbol;
            pnlMap[key] = displayPnl;
          }
        },
      });
      this.subscriptions.add(sub);
    });

    this.subscriptions.add(
      interval(1000).subscribe(() => {
        let totalUnrealized = 0;
        Object.values(pnlMap).forEach((val: any) => {
          totalUnrealized += val;
        });

        this.accountData.update((data) => {
          if (!data) return null;
          return {
            ...data,
            unrealizedPnl: totalUnrealized,
          };
        });
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
