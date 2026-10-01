import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';
import { TranslatePipe } from '@ngx-translate/core';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';

@Component({
  selector: 'app-token-detail-page',
  standalone: true,
  imports: [
    ChartComponent,
    RouterLink,
    NoDataComponent,
    TranslatePipe,
    TokenCardComponent,
  ],
  templateUrl: './token-detail.component.html',
  styleUrl: './token-detail.component.scss',
})
export class TokenDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);

  symbol = '';

  ngOnInit() {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
  }
}
