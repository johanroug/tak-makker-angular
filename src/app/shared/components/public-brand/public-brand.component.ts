import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-public-brand',
  imports: [RouterLink],
  templateUrl: './public-brand.component.html',
  styleUrl: './public-brand.component.scss',
})
export class PublicBrandComponent {
  readonly header = input(false);
  readonly inverse = input(false);
  readonly tagline = input(true);
  readonly destination = input('/');
}
