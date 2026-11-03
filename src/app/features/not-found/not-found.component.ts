import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MarketingHeader],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {}
