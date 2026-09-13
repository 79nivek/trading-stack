import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';

@Component({
  selector: 'app-unauthenticated-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ThemeToggleComponent, LangToggleComponent],
  templateUrl: './unauthenticated-layout.component.html',
  styleUrl: './unauthenticated-layout.component.scss'
})
export class UnauthenticatedLayoutComponent {}
