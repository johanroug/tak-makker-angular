import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';

@Component({
  selector: 'app-marketing-header',
  imports: [RouterLink, PublicBrandComponent],
  templateUrl: './marketing-header.component.html',
})
export class MarketingHeader {}
