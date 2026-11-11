import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TRADE_PAGES } from './trade-pages';

@Component({
  selector: 'app-trade-links',
  imports: [RouterLink],
  templateUrl: './trade-links.component.html',
  styleUrl: './trade-links.component.scss',
})
export class TradeLinksComponent {
  readonly pages = TRADE_PAGES;
}
