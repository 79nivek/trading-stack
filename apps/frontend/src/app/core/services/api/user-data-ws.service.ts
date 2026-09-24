import { Injectable, inject, OnDestroy } from '@angular/core';
import { SecretKeyService } from '../secret-key.service';
import { effect } from '@angular/core';
import { BackendApiService } from './backend-api.service';
import { AccountService } from '../account.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UserDataWsService implements OnDestroy {
  private secretKeyService = inject(SecretKeyService);

  private backendApi = inject(BackendApiService);
  private accountServ = inject(AccountService);

  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private pingInterval: any = null;
  private positionMap = new Map<string, number>();

  private accountUpdate$ = new Subject<void>();
  private accountUpdateSub: Subscription;

  constructor() {
    console.log('log UserDataWsService');

    // Debounce ACCOUNT_UPDATE events to avoid spamming the API on multiple fills
    this.accountUpdateSub = this.accountUpdate$
      .pipe(debounceTime(1000))
      .subscribe(() => {
        this.accountServ.fetchInfo();
      });

    effect(() => {
      const token = this.secretKeyService.token;
      if (token) {
        this.startWatching();
      } else {
        this.stopWatching();
      }
    });
  }

  temp() {
    // TODO: implement
  }

  private startWatching() {
    this.stopWatching(); // ensure clean state
    // 1. Fetch initial account info

    // 2. Fetch listenKey and connect WS
    this.backendApi.getListenKey().subscribe({
      next: (listenKey) => {
        if (listenKey) {
          this.listenKey = listenKey;
          this.connectWs();
          // Reconnect every 50 mins to keep listenKey fresh (Binance expires in 60 mins)
          this.pingInterval = setInterval(
            () => {
              this.startWatching();
            },
            50 * 60 * 1000,
          );
        }
      },
      error: (err) => console.error('Failed to get listen key', err),
    });
  }

  connectWs() {
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
      this.accountUpdate$.next();
    }

    if (data.e === 'ORDER_TRADE_UPDATE') {
      // TODO: handle order trade update
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
  }

  ngOnDestroy() {
    this.stopWatching();
    if (this.accountUpdateSub) {
      this.accountUpdateSub.unsubscribe();
    }
    this.accountUpdate$.complete();
  }
}
