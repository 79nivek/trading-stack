import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, computed, forwardRef } from '@angular/core';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export type AutoCompleteData = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-auto-complete',
  standalone: true,
  imports: [CommonModule, TranslateDirective, TranslatePipe],
  templateUrl: './auto-complete.component.html',
  styleUrl: './auto-complete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutoCompleteComponent),
      multi: true
    }
  ]
})
export class AutoCompleteComponent implements ControlValueAccessor {
  @Input() set data(val: AutoCompleteData[] | string[]) {
    // Map string[] to object array internally to reduce boilerplate in parents
    const mapped = (val || []).map(item =>
      typeof item === 'string' ? { label: item, value: item } : item
    );
    this._data.set(mapped);
  }
  @Input() isLoading = false;
  @Input() placeholderKey = 'FOLLOWED.SEARCH_PLACEHOLDER';
  @Input() loadingKey = 'FOLLOWED.LOADING_SYMBOLS';
  @Input() clearAfterSelect = true;

  @Output() itemSelected = new EventEmitter<AutoCompleteData>();

  _data = signal<AutoCompleteData[]>([]);
  searchText = signal<string>('');
  showDropdown = signal<boolean>(false);

  // Auto-complete manages its own filtering logic
  filteredData = computed(() => {
    const query = this.searchText().toLowerCase().trim();
    const all = this._data();
    if (!query) return all.slice(0, 30);
    return all.filter(item => item.label.toLowerCase().includes(query)).slice(0, 30);
  });

  // --- ControlValueAccessor ---
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange = (val: string) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched = () => {};

  writeValue(val: string): void {
    this.searchText.set(val || '');
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  // --- Events ---
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.onChange(value);
    this.showDropdown.set(true);
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    this.onTouched();
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  clearSearch(event: MouseEvent): void {
    event.preventDefault();
    this.searchText.set('');
    this.onChange('');
    this.showDropdown.set(false);
  }

  selectItem(event: MouseEvent, item: AutoCompleteData): void {
    event.preventDefault();
    if (this.clearAfterSelect) {
      this.searchText.set('');
      this.onChange('');
    } else {
      this.searchText.set(item.label);
      this.onChange(item.value);
    }
    this.showDropdown.set(false);
    this.itemSelected.emit(item);
  }
}
