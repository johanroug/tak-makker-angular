import { PRODUCT_PAGES } from './features/product/product-pages';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { TRADE_PAGES } from './features/trades/trade-pages';
import { LEGAL_PAGES } from './features/legal/legal-pages';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  ...LEGAL_PAGES.map<ServerRoute>((page) => ({ path: page.slug, renderMode: RenderMode.Prerender })),
  ...PRODUCT_PAGES.map<ServerRoute>((page) => ({ path: page.slug, renderMode: RenderMode.Prerender })),
  ...TRADE_PAGES.map<ServerRoute>((page) => ({
    path: page.slug,
    renderMode: RenderMode.Prerender,
  })),
  { path: '**', renderMode: RenderMode.Client },
];
