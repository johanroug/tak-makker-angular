import type { DraftTextEdit } from './draft-text-edit';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ProjectService } from '../../../core/projects/project.service';
import { OfferService } from '../../../core/offers/offer.service';
import { OfferPdfService } from '../../../core/offers/offer-pdf.service';
import { offerRequirements, OfferRequirement, validAmount } from '../../../core/offers/offer-readiness';
import { LineReview } from './line-review.component';
import { materialCategory } from './material-category';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type EditableDetails = {
  customerName: string;
  customerAddress: string;
  title: string;
  description: string;
  offerDescription: string;
  validityDays: number | null;
  paymentTerms: string;
  reservations: string;
};

@Component({
  selector: 'app-offer-preview',
  imports: [ReactiveFormsModule, DecimalPipe, LineReview],
  templateUrl: './offer-preview.component.html',
  styleUrl: './offer-preview.component.scss',
})
export class OfferPreview {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly offerService = inject(OfferService);
  private readonly pdfService = inject(OfferPdfService);
  readonly successDialog = viewChild.required<ElementRef<HTMLDialogElement>>('successDialog');
  readonly finalizedTotal = signal<number | null>(null);
  readonly isDownloadingPdf = signal(false);
  readonly pdfError = signal('');

  readonly data = input.required<ProjectData>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly newWorkItemIds = input<ReadonlySet<string>>(new Set());
  readonly newMaterialIds = input<ReadonlySet<string>>(new Set());
  readonly statusChanged = output<{kind: 'work' | 'material'; id: string; status: 'accepted' | 'rejected'}>();

  canApproveWork(item: ProjectData['workItems'][number]): boolean {
    return !!item.trade?.trim() && !!item.description?.trim() && validAmount(item.estimated_hours) && validAmount(this.data().project.hourly_rate);
  }

  canApproveMaterial(item: ProjectData['materials'][number]): boolean {
    return !!item.name?.trim() && !!item.description?.trim() && !!item.unit?.trim() && validAmount(item.quantity) && validAmount(item.unit_price);
  }

  changeStatus(kind: 'work' | 'material', id: string, status: 'accepted' | 'rejected'): void {
    if (this.hasPendingChanges() || this.isSavingChanges() || this.isFinalizing()) return;
    if (kind === 'work' ? !this.data().workItems.some(item => item.id === id) : !this.data().materials.some(item => item.id === id)) return;
    if (status === 'accepted') {
      if (kind === 'work') {
        const item = this.data().workItems.find(item => item.id === id);
        if (!item || !this.canApproveWork(item)) return;
      } else {
        const item = this.data().materials.find(item => item.id === id);
        if (!item || !this.canApproveMaterial(item)) return;
      }
    }
    this.statusChanged.emit({ kind, id, status });
  }

  revealSection(section: 'tasks' | 'materials'): void {
    const root = this.host.nativeElement.querySelector<HTMLElement>(`[data-draft-section="${section}"]`);
    const target = root?.querySelector<HTMLElement>('[data-new-suggestion="true"]') ?? root;
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }
  readonly textEdited = output<DraftTextEdit>();
  readonly textSaveStates = input<Record<string, 'editing' | 'saving' | 'saved' | 'error'>>({});
  private readonly editingTrades = new Map<string, string>();
  private readonly editingMaterialNames = new Map<string, string>();

  editField(kind: 'work' | 'material', id: string, field: string, event: Event, save: boolean): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (kind === 'material' && field === 'name') {
      if (save) this.editingMaterialNames.delete(id);
      else if (!this.editingMaterialNames.has(id)) {
        this.editingMaterialNames.set(id, this.data().materials.find(item => item.id === id)?.name ?? '');
      }
    }
    if (kind === 'work' && field === 'trade') {
      if (save) this.editingTrades.delete(id);
      else if (!this.editingTrades.has(id)) {
        this.editingTrades.set(id, this.data().workItems.find(item => item.id === id)?.trade ?? '');
      }
    }
    if (kind === 'work' && (field === 'trade' || field === 'description' || field === 'hours')) {
      this.textEdited.emit({ kind, id, field, value, save });
    } else if (kind === 'material' && (field === 'name' || field === 'description' || field === 'quantity' || field === 'unit' || field === 'unitPrice')) {
      this.textEdited.emit({ kind, id, field, value, save });
    }
  }

  textSaveLabel(kind: 'work' | 'material', id: string, field: string): string {
    const key = JSON.stringify([this.data().project.id, kind, id, field]);
    const state = this.textSaveStates()[key];
    return state === 'editing' ? 'Klik uden for feltet for at gemme.' : state === 'saving' ? 'Gemmer…' : state === 'saved' ? 'Gemt ✓' : state === 'error' ? 'Ikke gemt – prøv igen' : '';
  }

  readonly openDetailsInitially = input(false);
  readonly hasPendingChanges = input(false);
  readonly isSavingChanges = input(false);
  readonly requestTab = output<'tasks' | 'materials'>();
  readonly detailsOpened = output<void>();
  private readonly detailsDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('detailsDialog');

  readonly detailsSaved = output<void>();
  readonly offerFinalized = output<void>();
  readonly footerHeightChanged = output<number>();
  private readonly footer = viewChild.required<ElementRef<HTMLElement>>('offerFooter');
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');

  readonly isFinalizing = signal(false);
  readonly finalizeError = signal('');
  readonly finalizedOfferNumber = signal<string | null>(null);
  readonly finalizedOfferId = signal<string | null>(null);

  private originalDetails: EditableDetails | null = null;

  constructor() {
    afterNextRender(() => {
      const footer = this.footer().nativeElement;
      const measure = () => {
        const height = Math.ceil(footer.getBoundingClientRect().height);
        this.host.nativeElement.style.setProperty('--draft-footer-height', `${height}px`);
        this.footerHeightChanged.emit(height);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(footer);
      measure();
      this.destroyRef.onDestroy(() => observer.disconnect());
      if (this.openDetailsInitially()) this.startEditing();
    });
  }

  readonly detailsForm = new FormGroup({
    validityDays: new FormControl<number | null>(null),
    paymentTerms: new FormControl('', { nonNullable: true }),
    reservations: new FormControl('', { nonNullable: true }),
    customerName: new FormControl('', {
      nonNullable: true,
    }),
    customerAddress: new FormControl('', {
      nonNullable: true,
    }),
    title: new FormControl('', {
      nonNullable: true,
    }),
    description: new FormControl('', {
      nonNullable: true,
    }),
    offerDescription: new FormControl('', {
      nonNullable: true,
    }),
  });

  get acceptedWorkItems() {
    return this.data().workItems.filter((item) => item.status === 'accepted');
  }

  get workGroups() {
    const groups = new Map<string, ProjectData['workItems']>();
    for (const item of this.data().workItems) {
      const trade = this.editingTrades.get(item.id) ?? item.trade ?? '';
      const key = trade.trim().replace(/\s+/g, ' ').toLocaleLowerCase('da-DK');
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }
    // Keep both trades and tasks in their original order within each group.
    return [...groups].map(([key, items]) => ({
      key,
      title: (this.editingTrades.get(items[0].id) ?? items[0].trade ?? '').trim().replace(/\s+/g, ' ') || 'Øvrige opgaver',
      items,
    }));
  }

  get acceptedMaterials() {
    return this.data().materials.filter((material) => material.status === 'accepted');
  }

  get materialGroups() {
    const groups = new Map<string, ProjectData['materials']>();
    for (const item of this.data().materials) {
      const title = materialCategory(this.editingMaterialNames.get(item.id) ?? item.name);
      const group = groups.get(title);
      if (group) group.push(item);
      else groups.set(title, [item]);
    }
    return [...groups].map(([title, items]) => ({ title, items }));
  }

  get unreviewedCount(): number {
    return [...this.data().workItems, ...this.data().materials].filter(item => !item.status || item.status === 'suggested').length;
  }

  get laborTotal(): number {
    const hourlyRate = this.data().project.hourly_rate;

    if (hourlyRate === null) {
      return 0;
    }

    return this.acceptedWorkItems.reduce((total, item) => {
      if (item.estimated_hours === null) {
        return total;
      }

      return total + item.estimated_hours * hourlyRate;
    }, 0);
  }

  get materialsTotal(): number {
    return this.acceptedMaterials.reduce((total, material) => {
      if (material.quantity === null || material.unit_price === null) {
        return total;
      }

      return total + material.quantity * material.unit_price;
    }, 0);
  }

  get subtotal(): number {
    return this.laborTotal + this.materialsTotal;
  }

  get vatRate(): number {
    return 0.25;
  }

  get vatAmount(): number {
    return this.subtotal * this.vatRate;
  }

  get total(): number {
    return this.subtotal + this.vatAmount;
  }

  get missingRequirements(): OfferRequirement[] {
    return offerRequirements(this.data());
  }

  get canFinalizeOffer(): boolean {
    return (
      !this.isFinalizing() &&
      !this.isEditing() &&
      !this.isSaving() &&
      !this.finalizedOfferId() &&
      !this.hasPendingChanges() &&
      this.missingRequirements.length === 0
    );
  }

  get finalizeDisabledReason(): string {
    return this.hasPendingChanges()
      ? 'Afslut feltet for at gemme dine ændringer først'
      : this.missingRequirements.map((issue) => issue.label).join('. ');
  }

  fixRequirement(issue: OfferRequirement): void {
    if (issue.action === 'details') {
      this.startEditing();
      if (issue.field) {
        this.detailsDialog()
          .nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            `[formControlName="${issue.field}"]`,
          )
          ?.focus();
      }
    } else if (issue.action) {
      this.requestTab.emit(issue.action);
    }
  }

  getWorkItemPrice(item: ProjectData['workItems'][number]): number {
    const hourlyRate = this.data().project.hourly_rate;

    if (hourlyRate === null || item.estimated_hours === null) {
      return 0;
    }

    return item.estimated_hours * hourlyRate;
  }

  getMaterialPrice(material: ProjectData['materials'][number]): number {
    if (material.quantity === null || material.unit_price === null) {
      return 0;
    }

    return material.quantity * material.unit_price;
  }

  async finalizeOffer(): Promise<void> {
    if (!this.canFinalizeOffer) {
      return;
    }

    this.isFinalizing.set(true);
    this.finalizeError.set('');

    try {
      const offer = await this.projectService.finalizeOffer(this.data().project.id);

      this.finalizedOfferId.set(offer.id);
      this.finalizedOfferNumber.set(offer.offer_number);
      this.finalizedTotal.set(offer.pricing_total);
      this.pdfError.set('');
      this.successDialog().nativeElement.showModal();

      this.offerFinalized.emit();
    } catch (error) {
      console.error('Could not finalize offer:', error);

      this.finalizeError.set(
        error instanceof Error ? error.message : 'Kunne ikke færdiggøre tilbuddet.',
      );
    } finally {
      this.isFinalizing.set(false);
    }
  }

  closeSuccess(): void {
    if (!this.isDownloadingPdf()) this.successDialog().nativeElement.close();
  }

  async downloadFinalizedPdf(): Promise<void> {
    const offerId = this.finalizedOfferId();
    if (!offerId || this.isDownloadingPdf()) return;
    this.isDownloadingPdf.set(true);
    this.pdfError.set('');
    try {
      const saved = await this.offerService.getOffer(offerId);
      await this.pdfService.download(saved);
    } catch (error) {
      console.error('Could not download finalized offer:', error);
      this.pdfError.set('PDF kunne ikke hentes. Dit tilbud er gemt. Prøv igen eller vælg Se tilbud.');
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  startEditing(): void {
    if (this.isSaving() || this.isEditing()) return;
    const project = this.data().project;

    this.originalDetails = {
      customerName: project.customer_name ?? '',
      customerAddress: project.customer_address ?? '',
      title: project.title ?? '',
      description: project.description ?? '',
      offerDescription: project.offer_description ?? '',
      validityDays: project.validity_days ?? null,
      paymentTerms: project.payment_terms ?? '',
      reservations: project.reservations ?? '',
    };

    this.detailsForm.setValue(this.originalDetails);

    this.saveError.set('');
    this.isEditing.set(true);
    this.detailsDialog().nativeElement.showModal();
    this.detailsOpened.emit();
  }

  cancelEditing(): void {
    if (this.isSaving()) {
      return;
    }

    this.isEditing.set(false);
    this.detailsDialog().nativeElement.close();
    this.originalDetails = null;
    this.saveError.set('');
  }

  async saveDetails(): Promise<void> {
    if (this.isSaving() || !this.originalDetails) {
      return;
    }

    const current = this.detailsForm.getRawValue();
    const original = this.originalDetails;

    const changes: {
      customerName?: string;
      customerAddress?: string;
      title?: string;
      description?: string;
      offerDescription?: string;
      validityDays?: number | null;
      paymentTerms?: string;
      reservations?: string;
    } = {};

    if (current.customerName !== original.customerName) {
      changes.customerName = current.customerName;
    }

    if (current.customerAddress !== original.customerAddress) {
      changes.customerAddress = current.customerAddress;
    }

    if (current.title !== original.title) {
      changes.title = current.title;
    }

    if (current.description !== original.description) {
      changes.description = current.description;
    }

    if (current.offerDescription !== original.offerDescription) {
      changes.offerDescription = current.offerDescription;
    }

    if (
      current.validityDays !== null &&
      (!Number.isInteger(current.validityDays) || current.validityDays < 1)
    ) {
      this.saveError.set('Gyldighed skal være et helt antal dage på mindst 1, eller være tom.');
      return;
    }
    if (current.validityDays !== original.validityDays) changes.validityDays = current.validityDays;
    if (current.paymentTerms !== original.paymentTerms) changes.paymentTerms = current.paymentTerms;
    if (current.reservations !== original.reservations) changes.reservations = current.reservations;

    if (Object.keys(changes).length === 0) {
      this.cancelEditing();
      return;
    }

    if (changes.title !== undefined && !changes.title.trim()) {
      this.saveError.set('Projekttitlen må ikke være tom.');
      return;
    }

    this.isSaving.set(true);
    this.saveError.set('');

    try {
      await this.projectService.updateProjectDetails(this.data().project.id, changes);

      this.isEditing.set(false);
      this.detailsDialog().nativeElement.close();
      this.originalDetails = null;

      this.detailsSaved.emit();
    } catch (error) {
      console.error('Could not save project details:', error);

      this.saveError.set('Kunne ikke gemme projektoplysningerne.');
    } finally {
      this.isSaving.set(false);
    }
  }

  viewFinalizedOffer(): void {
    const offerId = this.finalizedOfferId();

    if (!offerId) {
      return;
    }

    void this.router.navigate(['/offers', offerId]);
  }
}
