import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { BackendApiService } from '../../core/services/backend-api.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-suggestion-page',
  standalone: true,
  imports: [CommonModule, TranslateDirective, ChartComponent],
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss'
})
export class SuggestionPageComponent {
  private backendApi = inject(BackendApiService);
  
  suggestionsQuery = injectQuery(() => ({
    queryKey: ['suggestions', 'futures'],
    queryFn: () => lastValueFrom(this.backendApi.getFuturesSuggestions(10))
  }));
}
