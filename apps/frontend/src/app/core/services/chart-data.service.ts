import {
  computed,
  effect,
  inject,
  Injectable,
  Injector,
  InputSignal,
  OnDestroy,
  Signal,
} from '@angular/core';
import { BehaviorSubject, filter, map, merge, of, switchMap } from 'rxjs';
import { DebounceEvent } from '../../shared/classes/debounce-event';
import { masterTokenStorageInstance } from './storage.service';
import { FuturesWebsocketService } from './api/futures-ws.service';
import { injectAccountQuery } from '../queries/account.query';
import { injectAlgoOrderQuery, injectOrderQuery } from '../queries/order.query';
import { injectPositionQuery } from '../queries/position.query';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Position } from '@trading-stack/shared-dto';

@Injectable({ providedIn: 'root' })
export class ChartDataService implements OnDestroy {
  private readonly futureWs = inject(FuturesWebsocketService);
  private readonly injector = inject(Injector);

  private accountQuery = injectAccountQuery();
  private positionQuery = injectPositionQuery();
  private orderQuery = injectOrderQuery();
  private algoOrderQuery = injectAlgoOrderQuery();

  readonly debounceInfo = new DebounceEvent(1500, () => {
    this.accountQuery.refetch();
    this.positionQuery.refetch();
  });
  readonly debounceOrder = new DebounceEvent(1500, () =>
    this.orderQuery.refetch(),
  );
  readonly debounceAlgoOrder = new DebounceEvent(1500, () =>
    this.algoOrderQuery.refetch(),
  );
  readonly debouncePosition = new DebounceEvent(1500, () =>
    this.positionQuery.refetch(),
  );

  public readonly futureBalance = computed(() => {
    const data = this.accountQuery.data();
    return data?.futureBalance || 0;
  });
  public readonly realizedPnlToday = computed(() => {
    const data = this.accountQuery.data();
    return data?.realizedPnlToday || 0;
  });

  public readonly $totalUnrealizedPnl = new BehaviorSubject<number>(0);

  constructor() {
    effect(() => {
      const token = masterTokenStorageInstance.get();
      if (token) {
        this.accountQuery.refetch();
      }
    });

    effect(() => {
      const info = this.accountQuery.data();
      if (info) {
        this.$totalUnrealizedPnl.next(info.unrealizedPnl);
      }
    });
  }

  registerSymbolRealtime(symbol: InputSignal<string>): Signal<
    | {
        unRealizedProfit: number;
        markPrice: number;
        pnl: number;
      }
    | undefined
  > {
    return toSignal(
      toObservable(symbol, { injector: this.injector }).pipe(
        filter((sym) => !!sym),
        switchMap((sym) =>
          toObservable(this.positionQuery.data, {
            injector: this.injector,
          }).pipe(
            map((data) => ({
              pos: data?.get(sym),
              sym: sym,
            })),
          ),
        ),
        filter((s) => !!s.pos),
        switchMap(({ sym, pos }) => this.registerWs(sym, pos!)),
      ),
      { injector: this.injector },
    );
  }

  registerTotalPnL(): Signal<
    | {
        unRealizedProfit: number;
        markPrice: number;
        pnl: number;
      }
    | undefined
  > {
    const totlaMap = new Map<
      string,
      {
        unRealizedProfit: number;
        markPrice: number;
        pnl: number;
      }
    >();
    return toSignal(
      toObservable(this.positionQuery.data, {
        injector: this.injector,
      }).pipe(
        filter((posMap) => !!posMap),
        switchMap((posMap) => {
          if (posMap.size === 0)
            return of({
              unRealizedProfit: 0,
              pnl: 0,
              markPrice: 0,
            });
          const syms = [...posMap!.entries()].map(([s, v]) =>
            this.registerWs(s, v),
          );
          return merge(...syms).pipe(
            map((item) => {
              totlaMap.set(item.symbol, item);

              let unRealizedProfit = 0;
              let pnl = 0;
              let markPrice = 0;

              totlaMap.forEach((item) => {
                unRealizedProfit += item.unRealizedProfit;
                pnl += item.pnl;
                markPrice += item.markPrice;
              });

              return {
                unRealizedProfit,
                pnl,
                markPrice,
              };
            }),
          );
        }),
      ),
      { injector: this.injector },
    );
  }

  private registerWs(s: string, pos: Position) {
    return this.futureWs.register(s).pipe(
      map((tick) => {
        if (!pos)
          return {
            symbol: s,
            unRealizedProfit: 0,
            markPrice: tick.close,
            pnl: 0,
          };

        const amt = parseFloat(pos?.positionAmt || '0');
        const entry = parseFloat(pos?.entryPrice || '0');
        const currentPrice = tick.close;
        const unRealizedProfit = amt * (currentPrice - entry);
        const pnl = unRealizedProfit - pos.fee;

        return {
          symbol: s,
          unRealizedProfit,
          markPrice: currentPrice,
          pnl,
        };
      }),
    );
  }

  ngOnDestroy() {
    this.debounceInfo.unsub();
    this.debounceAlgoOrder.unsub();
    this.debounceOrder.unsub();
  }
}
