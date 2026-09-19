import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { ChartComponent } from '../chart/chart.component';
import { TokenSuggestionDto, AiCheckResponseDto } from '@trading-stack/shared-dto';

export interface AiCheckState {
  loading: boolean;
  data?: AiCheckResponseDto;
  error?: boolean;
}

@Component({
  selector: 'app-token-card',
  standalone: true,
  imports: [CommonModule, TranslateDirective, TranslatePipe, ChartComponent],
  templateUrl: './token-card.component.html',
  styleUrl: './token-card.component.scss',
})
export class TokenCardComponent implements OnChanges {
  /** The token data to display */
  @Input({ required: true }) token!: TokenSuggestionDto;

  /** Optional rank index (1-based). If provided, shows a rank badge. */
  @Input() index?: number;

  /** Chart sync group key */
  @Input() syncGroup = 'token-card';

  /** Whether to show the Remove button in the card header */
  @Input() showRemoveButton = false;

  /**
   * When true, a drag handle icon appears at the left of the header.
   * The parent is responsible for setting draggable="true" on the wrapper
   * and handling dragstart/dragend events.
   */
  @Input() draggable = false;

  /** External AI check state passed down from the parent */
  @Input() aiCheckState: AiCheckState | undefined = undefined;

  @Output() aiCheck = new EventEmitter<string>();
  @Output() openPosition = new EventEmitter<string>();
  @Output() remove = new EventEmitter<void>();
  @Output() dragHover = new EventEmitter<boolean>();

  isCollapsed = signal<boolean>(true);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['token'] && changes['token'].firstChange) {
      this.isCollapsed.set(true);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  onAiCheck(event: MouseEvent): void {
    event.stopPropagation();
    this.aiCheck.emit(this.token.symbol);
  }

  onOpenPosition(event: MouseEvent): void {
    event.stopPropagation();
    this.openPosition.emit(this.token.symbol);
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
