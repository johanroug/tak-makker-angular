import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { LegalLinksComponent } from '../../shared/components/legal-links/legal-links.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';

@Component({
  selector: 'app-legal',
  imports: [RouterLink, PublicBrandComponent, LegalLinksComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
})
export class LegalComponent {
  private readonly route = inject(ActivatedRoute);
  get page() { return this.route.snapshot.data['legal']; }
  constructor() { resetPublicPageScroll(); }
}
