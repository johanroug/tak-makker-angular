import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../public-page-scroll';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, PublicBrandComponent],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShell {
  constructor() {
    resetPublicPageScroll();
  }
  readonly mode = input('register');
}
