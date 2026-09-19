import { Injectable, OnDestroy } from '@angular/core';
import { KlineData } from '@trading-stack/shared-dto';
import { Observable, Subject, Subscription, timer } from 'rxjs';
import { filter } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { ENV } from '../../../environments';

type StreamPayload = {
  stream: string; //  "stream" = vthousdt@kline_1m;
  data: {
    e: string; //      "e": "kline",
    E: number; //      "E": 1789250635122,
    s: string; //      "s": "VTHOUSDT",
    k: {
      t: number; //          "t": 1789250580000,
      T: number; //          "T": 1789250639999,
      s: string; //          "s": "VTHOUSDT",
      i: string; //          "i": "1m",
      f: number; //          "f": 60231932,
      L: number; //          "L": 60232203,
      o: string; //          "o": "0.0006608",
      c: string; //          "c": "0.0006593",
      h: string; //          "h": "0.0006610",
      l: string; //          "l": "0.0006590",
      v: string; //          "v": "16419152",
      n: number; //          "n": 272,
      x: boolean; //          "x": false,
      q: string; //          "q": "10834.2170145",
      V: string; //          "V": "6140680",
      Q: string; //          "Q": "4051.7419254",
      B: string; //          "B": "0"
    };
  };
};

@Injectable({
  providedIn: 'root',
})
export class FuturesWebsocketService implements OnDestroy {
  private wsSubject: WebSocketSubject<any> | null = null;
  private wsSubscription: Subscription | null = null;
  private timeoutSubscription: Subscription | null = null;

  private tokens = new Set<string>();
  private interval = '1m'; // default timeframe

  // A single subject to broadcast all incoming data
  private messageSubject = new Subject<
    KlineData & { normalizedToken: string }
  >();

  /**
   * Registers a token and returns an observable that emits its kline data.
   */
  register(token: string, timeFrame: string): Observable<KlineData> {
    const normalizedToken = token.trim().toLowerCase();

    if (!this.tokens.has(normalizedToken)) {
      this.tokens.add(normalizedToken);
      this.reconnect();
    }

    // Return an observable filtered for this specific token
    return this.messageSubject.asObservable().pipe(
      filter((msg) => {
        // Combined stream message format: { stream: 'btcusdt@kline_1m', data: { ... } }
        if (!msg || !msg.normalizedToken) return false;
        return msg.normalizedToken.startsWith(
          `${normalizedToken}@kline_${timeFrame}`,
        );
      }),
    );
  }

  /**
   * Unregisters a token.
   */
  unregister(token: string) {
    const normalizedToken = token.trim().toLowerCase();
    if (this.tokens.has(normalizedToken)) {
      this.tokens.delete(normalizedToken);
      this.reconnect();
    }
  }

  /**
   * Sets the timeframe and reconnects all active streams.
   */
  setTimeFrame(interval: string) {
    if (this.interval !== interval) {
      this.interval = interval;
      this.reconnect();
    }
  }

  /**
   * Closes the current connection and reconnects with the updated stream list.
   */
  private reconnect() {
    if (this.timeoutSubscription) {
      this.timeoutSubscription.unsubscribe();
    }

    this.timeoutSubscription = timer(200).subscribe(() => {
      this.disconnect();

      if (this.tokens.size === 0) {
        return;
      }

      const streams = Array.from(this.tokens)
        .map((t) => `${t}@kline_${this.interval}`)
        .join('/');

      const url = `${ENV.BINANCE_FUTURES_WS_URL}/market/stream?streams=${streams}`;

      this.wsSubject = webSocket({
        url,
        deserializer: (e) => JSON.parse(e.data),
      });

      this.wsSubscription = this.wsSubject.subscribe({
        next: (msg: StreamPayload) => {
          const kline = msg.data.k;
          // Normalize symbol to uppercase for consistent object mapping
          const data: KlineData = {
            time: Math.floor(kline.t / 1000), // convert ms to s for lightweight-charts
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
            normalizedToken: msg.stream,
          };
          this.messageSubject.next(data);
        },
        error: (err) => console.error('WebSocket Error:', err),
        complete: () => console.log('WebSocket Connection Closed'),
      });
    });
  }

  private disconnect() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
    if (this.wsSubject) {
      this.wsSubject.complete();
      this.wsSubject = null;
    }
  }

  ngOnDestroy() {
    this.disconnect();
    this.messageSubject.complete();
  }
}
