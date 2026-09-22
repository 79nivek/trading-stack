import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { BackendApiService } from './backend-api.service';
import { SecretKeyService } from '../secret-key.service';
import { effect } from '@angular/core';

export interface FuturesAccountData {
  futureBalance: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserDataWsService implements OnDestroy {
  private backendApi = inject(BackendApiService);
  private secretKeyService = inject(SecretKeyService);

  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private pingInterval: any = null;
  private positionMap = new Map<string, number>();


  public accountData = signal<FuturesAccountData | null>(null);

  constructor() {
    effect(() => {
      const token = this.secretKeyService.token;
      if (token) {
        this.startWatching();
      } else {
        this.stopWatching();
      }
    });
  }

  private startWatching() {
    this.stopWatching(); // ensure clean state

    // 1. Fetch initial account info
    this.backendApi.getFuturesAccountInfo().subscribe({
      next: (info) => {
        if (info.ok) {
          this.accountData.set({
            futureBalance: info.futureBalance,
            unrealizedPnl: info.unrealizedPnl,
            realizedPnlToday: info.realizedPnlToday,
          });
        }
      },
      error: (err) => console.error('Failed to get account info', err)
    });

    // 2. Fetch listenKey and connect WS
    this.backendApi.getListenKey().subscribe({
      next: (listenKey) => {
        if (listenKey) {
          this.listenKey = listenKey;
          this.connectWs();

          // Reconnect every 50 mins to keep listenKey fresh (Binance expires in 60 mins)
          this.pingInterval = setInterval(() => {
            this.startWatching();
          }, 50 * 60 * 1000);
        }
      },
      error: (err) => console.error('Failed to get listen key', err)
    });
  }


  private connectWs() {
    if (!this.listenKey) return;

    const wsUrl = `wss://fstream.binance.com/private/ws/${this.listenKey}`;
    console.log('Connecting to WS:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('UserData WS Connected Successfully!');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('UserData WS Message Received:', data.e, data);
        this.handleWsMessage(data);
      } catch (e) {
        console.error('WS Parse error', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('UserData WS Error', error);
    };

    this.ws.onclose = (event) => {
      console.log('UserData WS Closed', event.code, event.reason);
    };
  }

  private handleWsMessage(data: any) {
    if (!data || !data.e) return;

    if (data.e === 'ACCOUNT_UPDATE') {
      const update = data.a;
      this.accountData.update(prev => {
        if (!prev) prev = { futureBalance: 0, unrealizedPnl: 0, realizedPnlToday: 0 };
        const next = { ...prev };

        if (update.B && update.B.length > 0) {
          const usdtBalance = update.B.find((b: any) => b.a === 'USDT');
          if (usdtBalance) {
            next.futureBalance = parseFloat(usdtBalance.wb || '0');
          }
        }

        if (update.P && update.P.length > 0) {
          update.P.forEach((p: any) => {
            this.positionMap.set(p.s, parseFloat(p.up || '0'));
          });

          let totalUp = 0;
          this.positionMap.forEach(up => totalUp += up);
          next.unrealizedPnl = totalUp;
        }

        return next;
      });
    }

    if (data.e === 'ORDER_TRADE_UPDATE') {
      const order = data.o;
      if (order && order.x === 'TRADE') {
        const realizedProfit = parseFloat(order.rp || '0');
        if (realizedProfit !== 0) {
          this.accountData.update(prev => {
            if (!prev) prev = { futureBalance: 0, unrealizedPnl: 0, realizedPnlToday: 0 };
            return {
              ...prev,
              realizedPnlToday: prev.realizedPnlToday + realizedProfit
            };
          });
        }
      }
    }
  }

  private stopWatching() {
    this.positionMap.clear();

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listenKey = null;
    this.accountData.set(null);
  }

  ngOnDestroy() {
    this.stopWatching();
  }
}
