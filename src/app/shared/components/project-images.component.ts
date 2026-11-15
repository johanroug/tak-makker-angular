import { Component, ElementRef, OnDestroy, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { supabase } from '../../core/supabase/supabase.client';
import { BillingService } from '../../core/billing/billing.service';
import { ImageAnalysisInput, LocalProjectImage, ProjectImagesService } from '../../core/projects/project-images.service';
import { ProjectImageSlide, ProjectImageViewerComponent } from './project-image-viewer.component';

@Component({
  selector: 'app-project-images',
  imports: [ProjectImageViewerComponent],
  template: `
    @if (!messageId()) {
      <input #files type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden (change)="selected($event)" />
      <div class="image-heading">
        <span class="image-count">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="16" height="16" rx="2"/><path d="M7 2h13a2 2 0 0 1 2 2v13M3 17l5-6 8 10"/><circle cx="14" cy="10" r="2"/></svg>
          <strong>Projektbilleder</strong> <span>{{ localCount() }}/3</span>
        </span>
        <button type="button" class="info-button" aria-label="Information om projektbilleder" (click)="openInfo()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></button>
      </div>
      <dialog #imageInfo class="image-info-dialog" aria-label="Om projektbilleder" (click)="infoBackdropClick($event)">
        <header><h2>Om projektbilleder</h2><button type="button" class="info-button" aria-label="Luk billedinformation" (click)="closeInfo()">×</button></header>
        <div class="info-content">
          <p><strong>AI-analyser: {{ submitted() }}/3 brugt</strong></p>
          <p>Du kan have 3 lokale billeder ad gangen og frit udskifte dem.</p>
          <p>Projektet kan sende 3 billeder til AI i alt. Kun Fortsæt eller Send besked bruger AI-kvoten. Genforsøg med de samme billeder tæller ikke igen, og sletning frigiver ikke brugt AI-kvote.</p>
          <p>Billeder gemmes kun i denne browser og synkroniseres ikke mellem enheder.</p>
          <p>Funktionen kræver abonnement.</p>
        </div>
      </dialog>
      @if (pendingMessageId()) { <p class="note">Billeder afventer analyse. Send igen for at prøve den gemte besked; billederne bevares ved fejl.</p> }
    }
    <div class="images" [class.composer-images]="!messageId()">
      @for (image of visible(); track image.id) {
        <figure>
          @if (image.url) { <button type="button" class="image-open" (click)="openGallery(image.id)" aria-label="Vis projektbillede"><img [src]="image.url" alt="Projektbillede" /></button> }
          @else { <span class="missing">Billede er fjernet eller ikke tilgængeligt</span> }
          @if (image.url) { <button type="button" class="image-remove" [disabled]="disabled() || busy()" (click)="remove(image.id)" aria-label="Slet billede"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button> }
        </figure>
      }
    </div>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    @if (gallery().length) {
      <app-project-image-viewer [images]="gallery()" [initialIndex]="galleryIndex()" (closed)="closeGallery()" />
    }
  `,
  styles: `
    :host { display: block; } .note { margin: 4px 0; font-size: 11px; color: #687664; }
    .image-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .image-heading { min-height: 44px; color: #687664; }
    .image-count { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; }
    .image-count strong { color: #12372a; font-size: 14px; }
    .image-count svg, .info-button svg { width: 18px; height: 18px; flex: none; }
    .info-button { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #687664; font: inherit; font-size: 24px; cursor: pointer; }
    .info-button:focus-visible { outline: 2px solid #b98131; outline-offset: -2px; }
    .image-info-dialog { box-sizing: border-box; width: min(420px, calc(100vw - 32px)); max-width: none; max-height: calc(100dvh - 32px); padding: 0; margin: auto; border: 1px solid #d9ded5; border-radius: 14px; background: #fafbf8; color: #12372a; overflow-y: auto; }
    .image-info-dialog::backdrop { background: #061b1680; }
    .image-info-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px 0 20px; }
    .image-info-dialog h2 { margin: 0; font-size: 17px; }
    .info-content { padding: 0 20px 16px; font-size: 13px; line-height: 1.55; }
    .info-content p { margin: 12px 0; }
    .images { display: flex; gap: 8px; flex-wrap: wrap; } figure { position: relative; margin: 6px 0; }
    img { width: 76px; height: 76px; object-fit: cover; border-radius: 8px; }
    .image-remove { position: absolute; top: -4px; right: -4px; display: grid; place-items: center; box-sizing: border-box; width: 25px; height: 25px; padding: 0; border: 1px solid #d9ded5; border-radius: 50%; background: #fff; color: #12372a; cursor: pointer; }
    .image-remove svg { display: block; width: 16px; height: 16px; }
    .image-open { position: static; display: block; width: 76px; height: 76px; padding: 0; border: 0; border-radius: 8px; overflow: hidden; background: transparent; cursor: pointer; }
    .composer-images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 296px; gap: 10px; padding: 0; margin: 8px 0 14px; }
    .composer-images:empty { display: none; }
    .composer-images figure { margin: 0; }
    .composer-images .image-remove { top: 5px; right: 5px; width: 26px; height: 26px; font-size: 18px; }
    .composer-images .image-open { width: 100%; height: auto; aspect-ratio: 1; border-radius: 12px; }
    .composer-images img { display: block; width: 100%; height: 100%; border-radius: 12px; }
    .image-open:focus-visible { outline: 2px solid #b98131; outline-offset: 2px; }
    .error { color: #a13321; font-size: 12px; } .missing { font-size: 11px; color: #687664; }
  `,
})
export class ProjectImagesComponent implements OnDestroy {
  readonly projectId = input.required<string>();
  readonly companyId = input<string>();
  readonly messageId = input<string>();
  readonly disabled = input(false);
  readonly billing = inject(BillingService);
  private readonly storage = inject(ProjectImagesService);
  private readonly imageInfo = viewChild<ElementRef<HTMLDialogElement>>('imageInfo');
  private readonly files = viewChild<ElementRef<HTMLInputElement>>('files');
  readonly submitted = signal(0);
  readonly localCount = signal(0);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly visible = signal<(LocalProjectImage & { url?: string })[]>([]);
  readonly gallery = signal<ProjectImageSlide[]>([]);
  readonly galleryIndex = signal(0);
  readonly pendingMessageId = signal<string | undefined>(undefined);
  private images: LocalProjectImage[] = [];
  private readonly userId = signal<string | null>(null);
  private activeProject = '';
  private moved?: { from: string; to: string };
  private generation = 0;
  private readonly auth = supabase.auth.onAuthStateChange((_event, session) => this.userId.set(session?.user.id ?? null)).data.subscription;
  constructor() {
    if (typeof window !== 'undefined') void supabase.auth.getSession().then(({ data }) => this.userId.set(data.session?.user.id ?? null));
    effect(() => {
      this.storage.revision();
      const user = this.userId(), source = this.projectId(), message = this.messageId();
      const project = this.moved?.from === source ? this.moved.to : source;
      this.activeProject = project;
      const generation = ++this.generation;
      untracked(() => this.release()); this.images = []; this.submitted.set(0); this.localCount.set(0); this.pendingMessageId.set(undefined); this.error.set('');
      this.loading.set(!!user && typeof indexedDB !== 'undefined');
      if (user && typeof indexedDB !== 'undefined') void this.reload(user, project, message, generation);
    });
  }
  allowed(): boolean {
    const usage = this.billing.usage();
    return !!usage && ['active', 'internal'].includes(usage.status) && (!this.companyId() || usage.companyId === this.companyId());
  }
  working(): boolean { return this.busy() || this.loading(); }
  canChoose(): boolean { return typeof indexedDB !== 'undefined' && this.allowed() && !!this.userId() && !this.disabled() && !this.working() && this.localCount() < 3; }
  choose(): void { if (this.canChoose()) this.files()?.nativeElement.click(); }
  hasPending(): boolean { return this.images.some(image => image.blob && !image.analyzed); }
  private async reload(user: string, project: string, message = this.messageId(), generation = this.generation): Promise<void> {
    try {
      const record = await this.storage.read(user, project);
      if (generation !== this.generation || user !== this.userId() || project !== this.activeProject) return;
      this.release(); this.images = record.images; this.submitted.set(record.submitted); this.localCount.set(record.images.filter(image => image.blob).length);
      this.pendingMessageId.set(record.images.find(image => image.blob && !image.analyzed && image.messageId)?.messageId);
      this.visible.set(record.images.filter(image => message ? image.messageId === message : !!image.blob)
        .map(image => ({ ...image, url: image.blob ? URL.createObjectURL(image.blob) : undefined })));
    } catch (error) { if (generation === this.generation) this.showError(error); }
    finally { if (generation === this.generation) this.loading.set(false); }
  }
  async selected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []); target.value = '';
    if (!files.length || !this.canChoose()) return;
    const user = this.userId()!, project = this.activeProject, generation = this.generation;
    this.busy.set(true); this.error.set('');
    try { await this.storage.add(user, project, files); await this.reload(user, project, undefined, generation); }
    catch (error) { if (generation === this.generation) this.showError(error); }
    finally { this.busy.set(false); }
  }
  async remove(id: string): Promise<void> {
    const user = this.userId(); if (!user || this.disabled() || this.busy()) return;
    const project = this.activeProject, generation = this.generation;
    this.busy.set(true);
    try { await this.storage.remove(user, project, id); await this.reload(user, project, this.messageId(), generation); }
    catch (error) { if (generation === this.generation) this.showError(error); }
    finally { this.busy.set(false); }
  }
  async attach(project: string, messageId: string): Promise<ImageAnalysisInput | undefined> {
    const user = this.userId();
    if (!user) throw new Error('Log ind igen, før du sender billeder.');
    if (this.busy()) throw new Error('Vent, mens billederne gemmes.');
    if (this.activeProject !== project) {
      this.moved = { from: this.activeProject, to: project };
      try { await this.storage.move(user, this.activeProject, project); }
      catch (error) { this.moved = undefined; throw error; }
      this.activeProject = project;
    }
    const record = await this.storage.read(user, project);
    const pending = record.images.filter(image => image.blob && !image.analyzed);
    if (!pending.length) return undefined;
    if (!this.allowed()) throw new Error('Billedanalyse kræver aktivt abonnement.');
    if (pending.some(image => image.messageId && image.messageId !== messageId)) throw new Error('Prøv først den afventende billedanalyse igen.');
    await this.storage.update(user, project, record => {
      for (const image of record.images) if (pending.some(item => item.id === image.id)) image.messageId = messageId;
    });
    await this.reload(user, project);
    const images = await Promise.all(pending.map(async image => ({ id: image.id, dataUrl: await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(reader.error); reader.readAsDataURL(image.blob!);
    }) })));
    if (user !== this.userId()) throw new Error('Brugerkontoen er ændret. Send igen.');
    return { ownerId: user, messageId, images };
  }
  async analyzed(project: string, input?: ImageAnalysisInput): Promise<void> {
    const user = this.userId(); if (!user || !input || user !== input.ownerId) return;
    await this.storage.update(user, project, record => {
      for (const image of record.images) if (input.images.some(item => item.id === image.id)) image.analyzed = true;
    });
    await this.reload(user, project);
  }
  openInfo(): void { const dialog = this.imageInfo()?.nativeElement; if (dialog && !dialog.open) dialog.showModal(); }
  closeInfo(): void { this.imageInfo()?.nativeElement.close(); }
  infoBackdropClick(event: MouseEvent): void {
    const dialog = this.imageInfo()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
  openGallery(id: string): void {
    this.closeGallery();
    const images = this.images.filter(image => image.blob);
    const index = images.findIndex(image => image.id === id);
    if (index < 0) return;
    this.galleryIndex.set(index);
    this.gallery.set(images.map(image => ({ id: image.id, url: URL.createObjectURL(image.blob!) })));
  }
  closeGallery(): void {
    for (const image of this.gallery()) URL.revokeObjectURL(image.url);
    this.gallery.set([]);
  }
  private release(): void { this.closeInfo(); this.closeGallery(); for (const image of this.visible()) if (image.url) URL.revokeObjectURL(image.url); this.visible.set([]); }
  discardDraft(): void {
    const user = this.userId(), project = this.activeProject;
    if (user && project.startsWith('draft-')) void this.storage.deleteProject(user, project).catch(error => this.showError(error));
  }
  private showError(error: unknown): void {
    this.error.set(error instanceof DOMException && error.name === 'QuotaExceededError'
      ? 'Browserens lager er fyldt. Frigør plads på enheden og prøv igen.'
      : error instanceof Error ? error.message : 'Billederne kunne ikke gemmes i browseren.');
  }
  ngOnDestroy(): void { this.generation++; this.auth.unsubscribe(); this.release(); this.discardDraft(); }
}
