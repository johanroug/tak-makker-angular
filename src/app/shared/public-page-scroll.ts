import { ViewportScroller } from '@angular/common';
import { afterNextRender, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

// Only marketing pages reset scroll. Query-string navigation inside a project
// keeps its existing behaviour. Route data also emits when trade pages reuse a component.
export function resetPublicPageScroll(): void {
  const route = inject(ActivatedRoute);
  const scroller = inject(ViewportScroller);
  const injector = inject(Injector);
  route.data.pipe(takeUntilDestroyed()).subscribe(() => {
    afterNextRender(
      () => {
        if (!route.snapshot.fragment) scroller.scrollToPosition([0, 0]);
      },
      { injector },
    );
  });
}
