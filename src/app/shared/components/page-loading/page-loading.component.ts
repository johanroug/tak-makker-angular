import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-loading',
  template: `
    <section class="loading-page" role="status" aria-live="polite" aria-busy="true">
      <div class="loading-label"><span class="loading-emblem" aria-hidden="true">✦</span><div><small>ET ØJEBLIK</small><p>{{ label() }}</p></div></div>
      <div class="skeleton-layout" [class.project]="layout() === 'project'" aria-hidden="true">
        <div class="skeleton-card">
          <div class="skeleton short"></div>
          <div class="skeleton heading"></div>
          <div class="skeleton"></div><div class="skeleton medium"></div>
          <div class="skeleton-divider"></div>
          @for (row of [1, 2, 3]; track row) {
            <div class="skeleton-row"><div class="skeleton"></div><div class="skeleton short"></div></div>
          }
        </div>
        @if (layout() === 'project') {
          <div class="skeleton-card">
            <div class="skeleton heading"></div>
            @for (row of [1, 2]; track row) {
              <div class="skeleton-tile"><div class="skeleton medium"></div><div class="skeleton"></div><div class="skeleton short"></div></div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .loading-label { display: flex; align-items: center; gap: 10px; padding: 8px 0 20px; color: #8b8173; font-size: 13px; }
    .loading-label small { display: block; margin-bottom: 4px; font-size: 9px; letter-spacing: .14em; color: #a17c3c; font-weight: 700; }
    .loading-label p { margin: 0; font-size: 14px; font-weight: 600; color: #575047; }
    .loading-emblem { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px;
      background: linear-gradient(135deg, #fbefcf, #fffaf0); color: #b58429; font-size: 24px; animation: emblem-breathe 1.8s ease-in-out infinite; }
    @keyframes emblem-breathe { 50% { transform: rotate(12deg) scale(1.08); box-shadow: 0 0 24px #ebc36b33; } }
    .skeleton-layout { display: grid; gap: 28px; }
    .skeleton-card { min-width: 0; padding: 24px; border: 1px solid #efede8; border-radius: 14px; background: #fff; box-shadow: 0 8px 35px #30291d04; }
    .skeleton { height: 12px; margin: 14px 0; border-radius: 6px; background: linear-gradient(100deg, #f1efeb 25%, #faf9f6 45%, #f1efeb 65%);
      background-size: 250% 100%; animation: skeleton-sweep 1.8s ease-in-out infinite; }
    .short { width: 28%; } .medium { width: 70%; } .heading { width: 60%; height: 25px; margin-bottom: 28px; }
    .skeleton-divider { height: 1px; background: #f0eeea; margin: 28px 0; }
    .skeleton-row { display: flex; justify-content: space-between; gap: 30px; margin: 22px 0; }
    .skeleton-row .skeleton:first-child { flex: 1; }
    .skeleton-tile { padding: 12px; margin-top: 16px; border: 1px solid #f1efeb; border-radius: 10px; }
    @keyframes skeleton-sweep { to { background-position: -150% 0; } }
    @media (min-width: 901px) { .skeleton-layout.project { grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); } }
    @media (prefers-reduced-motion: reduce) { .skeleton, .loading-emblem { animation: none; } }
  `,
})
export class PageLoading {
  readonly label = input('Henter dine oplysninger…');
  readonly layout = input<'project' | 'document'>('document');
}
