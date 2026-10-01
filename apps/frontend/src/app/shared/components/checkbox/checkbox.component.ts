import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

let nextId = 0;

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() id = `app-checkbox-${nextId++}`;

  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange: any = () => {};
  onTouch: any = () => {};

  toggle(event: Event) {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    this.checked = input.checked;
    this.checkedChange.emit(this.checked);
    this.onChange(this.checked);
    this.onTouch();
  }

  writeValue(value: any): void {
    this.checked = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
