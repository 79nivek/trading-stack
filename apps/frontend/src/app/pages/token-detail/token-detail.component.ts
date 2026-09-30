import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-token-detail-page',
  standalone: true,
  imports: [ChartComponent, RouterLink],
  templateUrl: './token-detail.component.html',
  styleUrl: './token-detail.component.scss',
})
export class TokenDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);

  symbol: string = '';

  ngOnInit() {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
  }
}
