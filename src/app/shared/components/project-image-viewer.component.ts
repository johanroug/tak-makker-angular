import { Component, ElementRef, OnDestroy, afterNextRender, input, output, signal, viewChild } from '@angular/core';

export interface ProjectImageSlide { id: string; url: string; }

@Component({
  selector: 'app-project-image-viewer',
  template: `
    <dialog #dialog aria-label="Projektbilleder" (cancel)="$event.preventDefault(); closed.emit()" (click)="backdropClick($event)" (keydown)="onKeydown($event)">
      <header>
        <span aria-live="polite">Billede {{ currentIndex() + 1 }} af {{ images().length }}</span>
        <button type="button" class="close" aria-label="Luk billeder" (click)="closed.emit()" autofocus>×</button>
      </header>
      <div #viewport class="viewport" (scroll)="onScroll()" (wheel)="onWheel($event)" tabindex="0" aria-label="Bladr mellem projektets billeder">
        @for (image of images(); track image.id; let index = $index) {
          <div class="slide" role="group" [attr.aria-label]="'Billede ' + (index + 1) + ' af ' + images().length">
            <img [src]="image.url" [alt]="'Projektbillede ' + (index + 1)" draggable="false" />
          </div>
        }
      </div>
      @if (images().length > 1) {
        <nav aria-label="Billednavigation">
          <button type="button" [disabled]="currentIndex() === 0" (click)="goTo(currentIndex() - 1)">‹ Forrige</button>
          <button type="button" [disabled]="currentIndex() === images().length - 1" (click)="goTo(currentIndex() + 1)">Næste ›</button>
        </nav>
      }
    </dialog>
  `,
  styles: `
    dialog { width: min(1000px, calc(100vw - 32px)); max-width: none; max-height: calc(100dvh - 32px); padding: 0; margin: auto; border: 1px solid #d9ded5; border-radius: 16px; background: #fafbf8; color: #12372a; overflow: auto; }
    dialog::backdrop { background: #061b16bd; }
    header, nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; }
    header { font-size: 14px; font-weight: 600; }
    button { min-height: 44px; padding: 8px 14px; border: 0; border-radius: 8px; background: #e7eee2; color: #12372a; font: inherit; cursor: pointer; }
    button:disabled { opacity: .4; cursor: default; }
    button:focus-visible, .viewport:focus-visible { outline: 2px solid #b98131; outline-offset: -2px; }
    .close { width: 44px; padding: 0; font-size: 26px; background: transparent; }
    .viewport { display: flex; width: 100%; overflow-x: auto; overscroll-behavior: contain; scroll-snap-type: x mandatory; scrollbar-width: none; background: #102b23; }
    .viewport::-webkit-scrollbar { display: none; }
    .slide { display: flex; flex: 0 0 100%; min-width: 0; height: min(68dvh, 700px); align-items: center; justify-content: center; scroll-snap-align: start; scroll-snap-stop: always; }
    img { width: 100%; height: 100%; object-fit: contain; }
    @media (max-width: 600px) { dialog { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); border-radius: 12px; } header, nav { padding: 6px 10px; } }
  `,
})
export class ProjectImageViewerComponent implements OnDestroy {
  readonly images = input.required<ProjectImageSlide[]>();
  readonly initialIndex = input(0);
  readonly closed = output<void>();
  readonly currentIndex = signal(0);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private lastWheel = -Infinity;

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.goTo(this.initialIndex());
    });
  }
  goTo(index: number): void {
    const target = Math.max(0, Math.min(index, this.images().length - 1));
    this.currentIndex.set(target);
    const viewport = this.viewport().nativeElement;
    viewport.focus({ preventScroll: true });
    viewport.scrollTo({ left: target * viewport.clientWidth, behavior: 'instant' });
  }
  onScroll(): void {
    const viewport = this.viewport().nativeElement;
    if (viewport.clientWidth) this.currentIndex.set(Math.max(0, Math.min(this.images().length - 1, Math.round(viewport.scrollLeft / viewport.clientWidth))));
  }
  onWheel(event: WheelEvent): void {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 10 || performance.now() - this.lastWheel < 350) return;
    this.lastWheel = performance.now();
    this.goTo(this.currentIndex() + Math.sign(event.deltaY));
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.goTo(this.currentIndex() + (event.key === 'ArrowRight' ? 1 : -1));
  }
  backdropClick(event: MouseEvent): void {
    if (event.target !== this.dialog().nativeElement) return;
    const bounds = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.closed.emit();
  }
  ngOnDestroy(): void { this.dialog().nativeElement.close(); }
}
