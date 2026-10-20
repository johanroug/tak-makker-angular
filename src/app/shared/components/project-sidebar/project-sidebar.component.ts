import { DatePipe, DecimalPipe } from '@angular/common';
import { afterNextRender, Component, effect, ElementRef, inject, Injector, input, output, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';
import { OfferService } from '../../../core/offers/offer.service';
import { offerStatusLabel } from '../../../core/offers/offer-status';
import { AiFeedback, AiSuggestionSummary, NewSuggestionBadge } from '../ai-feedback/ai-feedback.component';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type SidebarTab = 'tasks' | 'materials' | 'chat' | 'offers';

@Component({
  selector: 'app-project-sidebar',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, AiFeedback, NewSuggestionBadge],
  templateUrl: './project-sidebar.component.html',
  styleUrl: './project-sidebar.component.scss',
})
export class ProjectSidebar implements OnDestroy {
  readonly statusLabel = offerStatusLabel;
  readonly data = input.required<ProjectData>();

  private readonly aiService = inject(AiService);

  private readonly projectService = inject(ProjectService);

  private readonly offerService = inject(OfferService);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly messageAdded = output<void>();

  readonly activeTab = signal<SidebarTab>(this.getTabFromQueryString());

  readonly offers = signal<Awaited<ReturnType<OfferService['getProjectOffers']>>>([]);

  readonly isLoadingOffers = signal(false);
  readonly offersError = signal('');

  readonly isSending = signal(false);
  readonly sendError = signal('');
  readonly aiResult = signal<AiSuggestionSummary | null>(null);
  readonly newWorkItemIds = signal<ReadonlySet<string>>(new Set());
  readonly newMaterialIds = signal<ReadonlySet<string>>(new Set());
  readonly aiCompleted = output<ProjectData>();
  private destroyed = false;

  ngOnDestroy(): void { this.destroyed = true; }

  dismissAiResult(): void {
    this.aiResult.set(null);
    this.newWorkItemIds.set(new Set());
    this.newMaterialIds.set(new Set());
  }

  openAiTarget(tab: 'tasks' | 'materials' | 'chat'): void {
    this.selectTab(tab);
    afterNextRender(() => {
      if (this.destroyed || this.activeTab() !== tab) return;
      const root = this.host.nativeElement;
      const selector = tab === 'chat' ? '.chat-messages .chat-message' : '[data-new-suggestion="true"]';
      const target = root.querySelector<HTMLElement>(selector)
        ?? root.querySelector<HTMLElement>('.sidebar-content h2');
      if (!target) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start', inline: 'nearest' });
      target.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
  readonly editError = signal('');
  readonly pendingSaves = signal(0);

  readonly workItemTrades = signal<Record<string, string>>({});

  readonly workItemDescriptions = signal<Record<string, string>>({});

  readonly workItemHours = signal<Record<string, string>>({});

  readonly materialNames = signal<Record<string, string>>({});

  readonly materialDescriptions = signal<Record<string, string>>({});

  readonly materialQuantities = signal<Record<string, string>>({});

  readonly materialUnits = signal<Record<string, string>>({});

  readonly materialUnitPrices = signal<Record<string, string>>({});

  // Only the preview receives these values. Persisted data remains the source
  // for saving, so finishing cannot race ahead of the blur save.
  getPreviewData(data: ProjectData): ProjectData {
    const number = (value: string | undefined, fallback: number | null) => {
      if (value === undefined) return fallback;
      const parsed = Number(value);
      return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    return {
      ...data,
      workItems: data.workItems.map((item) => ({
        ...item,
        trade: this.workItemTrades()[item.id]?.trim() ?? item.trade,
        description: this.workItemDescriptions()[item.id]?.trim() ?? item.description,
        estimated_hours: number(this.workItemHours()[item.id], item.estimated_hours),
      })),
      materials: data.materials.map((item) => ({
        ...item,
        name: this.materialNames()[item.id]?.trim() ?? item.name,
        description: this.materialDescriptions()[item.id]?.trim() ?? item.description,
        quantity: number(this.materialQuantities()[item.id], item.quantity),
        unit: this.materialUnits()[item.id]?.trim() ?? item.unit,
        unit_price: number(this.materialUnitPrices()[item.id], item.unit_price),
      })),
    };
  }

  hasPendingChanges(data: ProjectData): boolean {
    const preview = this.getPreviewData(data);
    return (
      JSON.stringify(preview.workItems) !== JSON.stringify(data.workItems) ||
      JSON.stringify(preview.materials) !== JSON.stringify(data.materials)
    );
  }

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    effect(() => {
      const data = this.data();
      this.acknowledge(
        this.workItemTrades,
        Object.fromEntries(data.workItems.map((item) => [item.id, item.trade])),
      );
      this.acknowledge(
        this.workItemDescriptions,
        Object.fromEntries(data.workItems.map((item) => [item.id, item.description])),
      );
      this.acknowledge(
        this.workItemHours,
        Object.fromEntries(data.workItems.map((item) => [item.id, item.estimated_hours])),
        true,
      );
      this.acknowledge(
        this.materialNames,
        Object.fromEntries(data.materials.map((item) => [item.id, item.name])),
      );
      this.acknowledge(
        this.materialDescriptions,
        Object.fromEntries(data.materials.map((item) => [item.id, item.description])),
      );
      this.acknowledge(
        this.materialQuantities,
        Object.fromEntries(data.materials.map((item) => [item.id, item.quantity])),
        true,
      );
      this.acknowledge(
        this.materialUnits,
        Object.fromEntries(data.materials.map((item) => [item.id, item.unit])),
      );
      this.acknowledge(
        this.materialUnitPrices,
        Object.fromEntries(data.materials.map((item) => [item.id, item.unit_price])),
        true,
      );
    });
    effect(() => {
      const activeTab = this.activeTab();

      if (activeTab === 'offers') {
        void this.loadOffers();
      }
    });
  }

  private acknowledge(
    values: WritableSignal<Record<string, string>>,
    saved: Record<string, string | number | null>,
    numeric = false,
  ): void {
    const edits = values();
    const remaining = Object.entries(edits).filter(([id, raw]) => {
      const value = numeric ? (raw.trim() === '' ? null : Number(raw)) : raw.trim();
      return value !== saved[id];
    });
    if (remaining.length !== Object.keys(edits).length) values.set(Object.fromEntries(remaining));
  }

  private async saveEdit(save: () => Promise<void>): Promise<void> {
    this.pendingSaves.update((count) => count + 1);
    try {
      await save();
    } finally {
      this.pendingSaves.update((count) => count - 1);
    }
  }

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: tab === 'chat' ? null : tab,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getTabFromQueryString(): SidebarTab {
    const tab = this.route.snapshot.queryParamMap.get('tab');

    if (tab === 'tasks' || tab === 'materials' || tab === 'offers' || tab === 'chat') {
      return tab;
    }

    return 'chat';
  }

  async loadOffers(): Promise<void> {
    this.isLoadingOffers.set(true);
    this.offersError.set('');

    try {
      const offers = await this.offerService.getProjectOffers(this.data().project.id);

      this.offers.set(offers);
    } catch (error) {
      console.error('Could not load offer history:', error);

      this.offersError.set('Kunne ikke hente tilbudshistorikken.');
    } finally {
      this.isLoadingOffers.set(false);
    }
  }

  viewOffer(offerId: string): void {
    void this.router.navigate(['/offers', offerId]);
  }

  get newestMessages() {
    return [...this.data().messages].reverse();
  }

  setWorkItemTrade(workItemId: string, value: string): void {
    this.workItemTrades.update((values) => ({
      ...values,
      [workItemId]: value,
    }));
  }

  getWorkItemTrade(item: ProjectData['workItems'][number]): string {
    const localValue = this.workItemTrades()[item.id];

    return localValue !== undefined ? localValue : (item.trade ?? '');
  }

  async saveWorkItemTrade(item: ProjectData['workItems'][number], value: string): Promise<void> {
    const trade = value.trim();

    if (trade === (item.trade ?? '')) {
      return;
    }

    try {
      await this.saveEdit(() =>
        this.projectService.updateWorkItem(this.data().project.id, item.id, { trade }),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update work item trade:', error);
    }
  }

  setWorkItemDescription(workItemId: string, value: string): void {
    this.workItemDescriptions.update((values) => ({
      ...values,
      [workItemId]: value,
    }));
  }

  getWorkItemDescription(item: ProjectData['workItems'][number]): string {
    const localValue = this.workItemDescriptions()[item.id];

    return localValue !== undefined ? localValue : (item.description ?? '');
  }

  async saveWorkItemDescription(
    item: ProjectData['workItems'][number],
    value: string,
  ): Promise<void> {
    const description = value.trim();

    if (description === (item.description ?? '')) {
      return;
    }

    try {
      await this.saveEdit(() =>
        this.projectService.updateWorkItem(this.data().project.id, item.id, { description }),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update work item description:', error);
    }
  }

  setWorkItemHours(workItemId: string, value: string): void {
    this.workItemHours.update((values) => ({
      ...values,
      [workItemId]: value,
    }));
  }

  getWorkItemHours(item: ProjectData['workItems'][number]): string {
    const localValue = this.workItemHours()[item.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return item.estimated_hours === null ? '' : String(item.estimated_hours);
  }

  getWorkItemLaborCost(item: ProjectData['workItems'][number]): number | null {
    const hoursValue = this.getWorkItemHours(item);

    const hourlyRate = this.data().project.hourly_rate;

    if (hoursValue === '' || hourlyRate === null) {
      return null;
    }

    const hours = Number(hoursValue);

    if (Number.isNaN(hours) || hours < 0) {
      return null;
    }

    return hours * hourlyRate;
  }

  canAcceptWorkItem(item: ProjectData['workItems'][number]): boolean {
    const trade = this.getWorkItemTrade(item).trim();

    const description = this.getWorkItemDescription(item).trim();

    const hoursValue = this.getWorkItemHours(item);

    const hourlyRate = this.data().project.hourly_rate;

    if (!trade || !description || hoursValue === '' || hourlyRate === null) {
      return false;
    }

    const hours = Number(hoursValue);

    return !Number.isNaN(hours) && hours >= 0 && hourlyRate >= 0;
  }

  async updateWorkItemStatus(workItemId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const item = this.data().workItems.find((workItem) => workItem.id === workItemId);

    if (status === 'accepted' && (!item || !this.canAcceptWorkItem(item))) {
      return;
    }

    try {
      await this.saveEdit(() =>
        this.projectService.updateWorkItemStatus(this.data().project.id, workItemId, status),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update work item status:', error);
    }
  }

  async updateEstimatedHours(item: ProjectData['workItems'][number], value: string): Promise<void> {
    const estimatedHours = value === '' ? null : Number(value);

    if (estimatedHours !== null && (Number.isNaN(estimatedHours) || estimatedHours < 0)) {
      return;
    }

    if (estimatedHours === item.estimated_hours) {
      return;
    }

    try {
      await this.saveEdit(() =>
        this.projectService.updateWorkItemEstimatedHours(
          this.data().project.id,
          item.id,
          estimatedHours,
        ),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update estimated hours:', error);
    }
  }

  setMaterialName(materialId: string, value: string): void {
    this.materialNames.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialName(material: ProjectData['materials'][number]): string {
    const localValue = this.materialNames()[material.id];

    return localValue !== undefined ? localValue : (material.name ?? '');
  }

  async saveMaterialName(material: ProjectData['materials'][number], value: string): Promise<void> {
    const name = value.trim();

    if (name === (material.name ?? '')) {
      return;
    }

    await this.saveMaterialValues(material, { name });
  }

  setMaterialDescription(materialId: string, value: string): void {
    this.materialDescriptions.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialDescription(material: ProjectData['materials'][number]): string {
    const localValue = this.materialDescriptions()[material.id];

    return localValue !== undefined ? localValue : (material.description ?? '');
  }

  async saveMaterialDescription(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const description = value.trim();

    if (description === (material.description ?? '')) {
      return;
    }

    await this.saveMaterialValues(material, { description });
  }

  setMaterialQuantity(materialId: string, value: string): void {
    this.materialQuantities.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialQuantity(material: ProjectData['materials'][number]): string {
    const localValue = this.materialQuantities()[material.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return material.quantity === null ? '' : String(material.quantity);
  }

  setMaterialUnit(materialId: string, value: string): void {
    this.materialUnits.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialUnit(material: ProjectData['materials'][number]): string {
    const localValue = this.materialUnits()[material.id];

    return localValue !== undefined ? localValue : (material.unit ?? '');
  }

  setMaterialUnitPrice(materialId: string, value: string): void {
    this.materialUnitPrices.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialUnitPrice(material: ProjectData['materials'][number]): string {
    const localValue = this.materialUnitPrices()[material.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return material.unit_price === null ? '' : String(material.unit_price);
  }

  getMaterialTotal(material: ProjectData['materials'][number]): number | null {
    const quantityValue = this.getMaterialQuantity(material);

    const unitPriceValue = this.getMaterialUnitPrice(material);

    if (quantityValue === '' || unitPriceValue === '') {
      return null;
    }

    const quantity = Number(quantityValue);
    const unitPrice = Number(unitPriceValue);

    if (Number.isNaN(quantity) || Number.isNaN(unitPrice) || quantity < 0 || unitPrice < 0) {
      return null;
    }

    return quantity * unitPrice;
  }

  canAcceptMaterial(material: ProjectData['materials'][number]): boolean {
    const name = this.getMaterialName(material).trim();

    const description = this.getMaterialDescription(material).trim();

    const quantityValue = this.getMaterialQuantity(material);

    const unit = this.getMaterialUnit(material).trim();

    const unitPriceValue = this.getMaterialUnitPrice(material);

    if (!name || !description || quantityValue === '' || !unit || unitPriceValue === '') {
      return false;
    }

    const quantity = Number(quantityValue);
    const unitPrice = Number(unitPriceValue);

    return !Number.isNaN(quantity) && quantity >= 0 && !Number.isNaN(unitPrice) && unitPrice >= 0;
  }

  async updateMaterialStatus(materialId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const material = this.data().materials.find((item) => item.id === materialId);

    if (status === 'accepted' && (!material || !this.canAcceptMaterial(material))) {
      return;
    }

    try {
      await this.saveEdit(() =>
        this.projectService.updateMaterialStatus(this.data().project.id, materialId, status),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update material status:', error);
    }
  }

  async updateMaterialQuantity(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const quantity = value === '' ? null : Number(value);

    if (quantity !== null && (Number.isNaN(quantity) || quantity < 0)) {
      return;
    }

    if (quantity === material.quantity) {
      return;
    }

    await this.saveMaterialValues(material, { quantity });
  }

  async updateMaterialUnit(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const unit = value.trim();

    if (unit === (material.unit ?? '')) {
      return;
    }

    await this.saveMaterialValues(material, { unit });
  }

  async updateMaterialUnitPrice(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const unitPrice = value === '' ? null : Number(value);

    if (unitPrice !== null && (Number.isNaN(unitPrice) || unitPrice < 0)) {
      return;
    }

    if (unitPrice === material.unit_price) {
      return;
    }

    await this.saveMaterialValues(material, { unitPrice });
  }

  private async saveMaterialValues(
    material: ProjectData['materials'][number],
    changes: {
      name?: string;
      description?: string;
      quantity?: number | null;
      unit?: string;
      unitPrice?: number | null;
    },
  ): Promise<void> {
    try {
      await this.saveEdit(() =>
        this.projectService.updateMaterial(this.data().project.id, material.id, changes),
      );

      this.editError.set('');
      this.messageAdded.emit();
    } catch (error) {
      this.editError.set(
        'Ændringen kunne ikke gemmes. Dine rettelser vises stadig i kladden. Gå tilbage til feltet og prøv igen.',
      );
      console.error('Could not update material:', error);
    }
  }

  async sendMessage(): Promise<void> {
    const message = this.messageControl.value.trim();

    const projectId = this.data().project.id;

    if (!message || this.isSending()) {
      return;
    }

    const priorWorkIds = new Set(this.data().workItems.map((item) => item.id));
    const priorMaterialIds = new Set(this.data().materials.map((item) => item.id));
    let messageSaved = false;

    this.isSending.set(true);
    this.sendError.set('');
    this.dismissAiResult();

    try {
      const savedMessage = await this.projectService.addMessage(projectId, message);
      messageSaved = true;

      if (!this.destroyed && this.data().project.id === projectId) {
        this.messageControl.reset();
        this.aiCompleted.emit({
          ...this.data(),
          messages: [...this.data().messages, savedMessage],
        });
      }

      const aiResponse = await this.aiService.generateOffer(projectId);

      await this.projectService.saveAiResponse(projectId, aiResponse);

      const assistantMessage = aiResponse.questions
        .map((question, index) => `${index + 1}. ${question}`)
        .join('\n\n');

      if (assistantMessage) {
        await this.projectService.addAssistantMessage(projectId, assistantMessage);

      }

      if (this.destroyed) return;
      const saved = await this.projectService.getProject(projectId);
      if (this.destroyed) return;
      const responseWorkIds = new Set(aiResponse.workItems.map((item) => item.id));
      const responseMaterialIds = new Set(aiResponse.materials.map((item) => item.id));
      const workIds = new Set(saved.workItems.filter((item) =>
        responseWorkIds.has(item.id) && !priorWorkIds.has(item.id) && item.status === 'suggested',
      ).map((item) => item.id));
      const materialIds = new Set(saved.materials.filter((item) =>
        responseMaterialIds.has(item.id) && !priorMaterialIds.has(item.id) && item.status === 'suggested',
      ).map((item) => item.id));
      this.newWorkItemIds.set(workIds);
      this.newMaterialIds.set(materialIds);
      this.aiCompleted.emit(saved);
      this.aiResult.set({ workItems: workIds.size, materials: materialIds.size });
    } catch (error) {
      console.error(error);

      if (!this.destroyed) this.sendError.set(messageSaved
        ? 'Din besked er gemt, men AI-svaret kunne ikke færdigbehandles. Genindlæs projektet, og kontrollér samtalen, før du prøver igen.'
        : 'Din besked kunne ikke gemmes. Prøv igen.');
    } finally {
      if (!this.destroyed) this.isSending.set(false);
    }
  }
}
