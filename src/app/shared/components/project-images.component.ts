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
      <details class="image-info">
        <summary title="Information om projektbilleder">
          <span class="image-count">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="15.5" cy="8.5" r="2"/><path d="m3 17 5-6 8 10"/></svg>
            {{ uploaded() }}/3 billeder brugt
          </span>
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" role="img" aria-label="Information om projektbilleder"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>
        </summary>
        <p class="note">Maks. 3 billeder i projektets levetid i denne browser. Sletning frigiver ikke uploads.</p>
        <p class="note">Billeder gemmes kun i denne browser og synkroniseres ikke mellem enheder.</p>
        <p class="note">Ved analyse sendes billeder via Supabase til OpenAI. Personer med adgang til browserprofilen kan få adgang til billederne.</p>
        <p class="note">Billedupload og analyse kræver aktivt abonnement.</p>
      </details>
      @if (pendingMessageId()) { <p class="note">Billeder afventer analyse. Send igen for at prøve den gemte besked; billederne bevares ved fejl.</p> }
    }
    <div class="images">
      @for (image of visible(); track image.id) {
        <figure>
          @if (image.url) { <button type="button" class="image-open" (click)="openGallery(image.id)" aria-label="Vis projektbillede"><img [src]="image.url" alt="Projektbillede" /></button> }
          @else { <span class="missing">Billede er fjernet eller ikke tilgængeligt</span> }
          @if (image.url) { <button type="button" [disabled]="disabled() || busy()" (click)="remove(image.id)" aria-label="Slet billede">×</button> }
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
    .image-info { color: #687664; font-size: 12px; }
    summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; cursor: pointer; list-style: none; border-radius: 6px; }
    summary::-webkit-details-marker { display: none; }
    summary:focus-visible { outline: 2px solid #b98131; outline-offset: 2px; }
    .image-count { display: inline-flex; align-items: center; gap: 8px; }
    summary svg { width: 18px; height: 18px; flex: none; }
    .info-icon { margin-right: 4px; }
    .images { display: flex; gap: 8px; flex-wrap: wrap; } figure { position: relative; margin: 6px 0; }
    img { width: 76px; height: 76px; object-fit: cover; border-radius: 8px; }
    button { position: absolute; top: -4px; right: -4px; width: 25px; height: 25px; border: 1px solid #d9ded5; border-radius: 50%; background: #fff; color: #12372a; cursor: pointer; }
    .image-open { position: static; display: block; width: 76px; height: 76px; padding: 0; border: 0; border-radius: 8px; overflow: hidden; }
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
  private readonly files = viewChild<ElementRef<HTMLInputElement>>('files');
  readonly uploaded = signal(0);
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
      untracked(() => this.release()); this.images = []; this.uploaded.set(0); this.pendingMessageId.set(undefined); this.error.set('');
      this.loading.set(!!user && typeof indexedDB !== 'undefined');
      if (user && typeof indexedDB !== 'undefined') void this.reload(user, project, message, generation);
    });
  }
  allowed(): boolean {
    const usage = this.billing.usage();
    return !!usage && ['active', 'internal'].includes(usage.status) && (!this.companyId() || usage.companyId === this.companyId());
  }
  working(): boolean { return this.busy() || this.loading(); }
  canChoose(): boolean { return typeof indexedDB !== 'undefined' && this.allowed() && !!this.userId() && !this.disabled() && !this.working() && this.uploaded() < 3 && !this.pendingMessageId(); }
  choose(): void { if (this.canChoose()) this.files()?.nativeElement.click(); }
  hasPending(): boolean { return this.images.some(image => image.blob && !image.analyzed); }
  private async reload(user: string, project: string, message = this.messageId(), generation = this.generation): Promise<void> {
    try {
      const record = await this.storage.read(user, project);
      if (generation !== this.generation || user !== this.userId() || project !== this.activeProject) return;
      this.release(); this.images = record.images; this.uploaded.set(record.uploaded);
      this.pendingMessageId.set(record.images.find(image => image.blob && !image.analyzed && image.messageId)?.messageId);
      this.visible.set(record.images.filter(image => message ? image.messageId === message : !image.messageId && !!image.blob)
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
  private release(): void { this.closeGallery(); for (const image of this.visible()) if (image.url) URL.revokeObjectURL(image.url); this.visible.set([]); }
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
