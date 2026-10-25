import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  readonly delay = input(0, {
    alias: 'appReveal',
    transform: (value: unknown) => Math.max(0, Math.min(240, numberAttribute(value, 0))),
  });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduced.matches || !('IntersectionObserver' in window) || !element.animate) return;
      let animation: Animation | undefined;
      // Content stays visible without JavaScript and in prerendered HTML.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          if (!reduced.matches) {
            animation = element.animate(
              [
                { opacity: 0, translate: '0 22px' },
                { opacity: 1, translate: '0 0' },
              ],
              {
                duration: 650,
                delay: this.delay(),
                easing: 'cubic-bezier(.22,1,.36,1)',
                fill: 'backwards',
              },
            );
          }
        },
        { threshold: 0, rootMargin: '0px 0px -16px 0px' },
      );
      const cancel = () => {
        if (reduced.matches) {
          observer.disconnect();
          animation?.cancel();
        }
      };
      reduced.addEventListener('change', cancel);
      observer.observe(element);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        animation?.cancel();
        reduced.removeEventListener('change', cancel);
      });
    });
  }
}

@Directive({ selector: '[appParallax]' })
export class ParallaxDirective {
  readonly speed = input(0.07, {
    alias: 'appParallax',
    transform: (value: unknown) => Math.max(-0.12, Math.min(0.12, numberAttribute(value, 0.07))),
  });

  constructor() {
    const element = inject<ElementRef<HTMLElement | SVGElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const enabled = window.matchMedia(
        '(min-width: 800px) and (prefers-reduced-motion: no-preference)',
      );
      if (!('IntersectionObserver' in window)) return;
      let visible = false;
      let frame = 0;
      const paint = () => {
        frame = 0;
        if (enabled.matches && visible) {
          // Individual translate preserves existing rotation and entrance effects.
          element.style.translate = `0 ${Math.min(800, Math.max(0, window.scrollY)) * this.speed()}px`;
        }
      };
      const schedule = () => {
        if (enabled.matches && visible && !frame) frame = window.requestAnimationFrame(paint);
      };
      const update = () => {
        if (!enabled.matches) {
          window.cancelAnimationFrame(frame);
          frame = 0;
          element.style.removeProperty('translate');
        } else schedule();
      };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      });
      observer.observe(element);
      window.addEventListener('scroll', schedule, { passive: true });
      enabled.addEventListener('change', update);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        window.cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        enabled.removeEventListener('change', update);
        element.style.removeProperty('translate');
      });
    });
  }
}
