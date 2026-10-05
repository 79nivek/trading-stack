import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';

@Component({
  selector: 'app-token-detail-page',
  standalone: true,
  imports: [
    TokenCardComponent
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
