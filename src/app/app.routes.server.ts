import { RenderMode, ServerRoute } from '@angular/ssr';
import { TRADE_PAGES } from './features/trades/trade-pages';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  ...TRADE_PAGES.map<ServerRoute>((page) => ({
    path: page.slug,
    renderMode: RenderMode.Prerender,
  })),
  { path: '**', renderMode: RenderMode.Client },
];
