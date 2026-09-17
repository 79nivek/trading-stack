import { Component, inject } from '@angular/core';

import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-lang-toggle',
  standalone: true,
  imports: [],
  templateUrl: './lang-toggle.component.html',
  styleUrl: './lang-toggle.component.scss'
})
export class LangToggleComponent {
  langService = inject(LanguageService);
}
