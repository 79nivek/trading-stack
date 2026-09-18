import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LogicalRange } from 'lightweight-charts';

export interface ChartCrosshairEvent {
  groupId: string;
  sourceId: string;
  time: number | null;
  point: { x: number; y: number } | null;
}

export interface ChartZoomEvent {
  groupId: string;
  sourceId: string;
  range: LogicalRange | null;
}

@Injectable({ providedIn: 'root' })
export class ChartSyncService {
  private readonly _crosshairMove$ = new Subject<ChartCrosshairEvent>();
  private readonly _zoomChange$ = new Subject<ChartZoomEvent>();

  /**
   * Phát crosshair event từ một chart instance.
   * Các chart khác cùng groupId sẽ nhận và apply lên chart của mình.
   */
  emitCrosshair(event: ChartCrosshairEvent): void {
    this._crosshairMove$.next(event);
  }

  /**
   * Subscribe crosshair events của một group, loại trừ chính sourceId đang phát.
   */
  onCrosshair(groupId: string, excludeSourceId: string) {
    return this._crosshairMove$.pipe(
      filter((e) => e.groupId === groupId && e.sourceId !== excludeSourceId)
    );
  }

  /**
   * Phát zoom/pan event từ một chart instance.
   */
  emitZoom(event: ChartZoomEvent): void {
    this._zoomChange$.next(event);
  }

  /**
   * Subscribe zoom events của một group, loại trừ chính sourceId đang phát.
   */
  onZoom(groupId: string, excludeSourceId: string) {
    return this._zoomChange$.pipe(
      filter((e) => e.groupId === groupId && e.sourceId !== excludeSourceId)
    );
  }
}
