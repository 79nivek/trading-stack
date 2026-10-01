import { Component, inject } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}
