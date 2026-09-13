import { Component } from '@angular/core';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';

@Component({
  selector: 'app-followed-page',
  standalone: true,
  imports: [TranslatePipe, TranslateDirective],
  templateUrl: './followed.component.html',
  styleUrl: './followed.component.scss'
})
export class FollowedPageComponent {}
