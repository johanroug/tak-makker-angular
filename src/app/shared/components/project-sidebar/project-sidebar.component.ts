import type { DraftTextEdit } from '../offer-preview/draft-text-edit';
import { WorkspaceIcon } from '../workspace-icon.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';
import { OfferService } from '../../../core/offers/offer.service';
import { offerStatusLabel } from '../../../core/offers/offer-status';
import { AiFeedback, AiSuggestionSummary } from '../ai-feedback/ai-feedback.component';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-sidebar',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, AiFeedback, WorkspaceIcon],
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly messageAdded = output<void>();
  readonly sectionRequested = output<'tasks' | 'materials'>();
  readonly chatOpen = signal(false);
  private readonly historyDialog = viewChild.required<ElementRef<HTMLDialogElement>>('historyDialog');
  private readonly chatMessages = viewChild<ElementRef<HTMLElement>>('chatMessages');
  private readonly latestMessageId = computed(() => this.data().messages.at(-1)?.id);

  openHistory(): void {
    void this.loadOffers();
    if (!this.historyDialog().nativeElement.open) this.historyDialog().nativeElement.showModal();
  }


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

  ngOnDestroy(): void {
    this.destroyed = true;
    for (const timer of this.fieldTimers.values()) clearTimeout(timer);
    this.fieldTimers.clear();
  }

  dismissAiResult(): void {
    this.aiResult.set(null);
    this.newWorkItemIds.set(new Set());
    this.newMaterialIds.set(new Set());
  }

  openAiTarget(tab: 'tasks' | 'materials' | 'chat'): void {
    if (tab !== 'chat') {
      this.sectionRequested.emit(tab);
      return;
    }
    this.chatOpen.set(true);
    afterNextRender(() => {
      if (this.destroyed) return;
      const root = this.host.nativeElement;
      const target = root.querySelector<HTMLElement>('.chat-messages .chat-message:last-child');
      if (!target) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start', inline: 'nearest' });
      target.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
  readonly editError = signal('');
  readonly pendingSaves = signal(0);
  readonly fieldSaveStates = signal<Record<string, 'editing' | 'saving' | 'saved' | 'error'>>({});
  private readonly fieldVersions = new Map<string, number>();
  private readonly fieldTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private clearFieldTimer(key: string): void {
    const timer = this.fieldTimers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    this.fieldTimers.delete(key);
  }

  fieldKey(kind: 'work' | 'material', id: string, field: string): string {
    return JSON.stringify([this.data().project.id, kind, id, field]);
  }

  fieldEdited(key: string): void {
    this.clearFieldTimer(key);
    this.fieldVersions.set(key, (this.fieldVersions.get(key) ?? 0) + 1);
    this.fieldSaveStates.update((states) => {
      const next = { ...states };
      if (['trade', 'name', 'description'].includes(JSON.parse(key)[3])) next[key] = 'editing';
      else delete next[key];
      return next;
    });
  }

  private finishTextEditing(key: string): void {
    if (this.fieldSaveStates()[key] !== 'editing') return;
    this.fieldSaveStates.update(states => {
      const next = { ...states };
      delete next[key];
      return next;
    });
  }

  fieldSaveLabel(key: string): string {
    const state = this.fieldSaveStates()[key];
    return state === 'editing' ? 'Klik uden for feltet for at gemme.' : state === 'saving' ? 'Gemmer…' : state === 'saved' ? 'Gemt ✓' : state === 'error' ? 'Ikke gemt – prøv igen' : '';
  }

  private async saveField(key: string, save: () => Promise<void>): Promise<void> {
    this.clearFieldTimer(key);
    const version = (this.fieldVersions.get(key) ?? 0) + 1;
    this.fieldVersions.set(key, version);
    const setState = (state: 'saving' | 'saved' | 'error') => {
      if (!this.destroyed && this.fieldVersions.get(key) === version) {
        this.fieldSaveStates.update((states) => ({ ...states, [key]: state }));
        if (state === 'saved') {
          this.fieldTimers.set(key, setTimeout(() => {
            this.fieldTimers.delete(key);
            if (!this.destroyed && this.fieldVersions.get(key) === version) {
              this.fieldSaveStates.update((states) => {
                const next = { ...states };
                delete next[key];
                return next;
              });
            }
          }, 3000));
        }
      }
    };
    setState('saving');
    try {
      await this.saveEdit(save);
      setState('saved');
    } catch (error) {
      setState('error');
      throw error;
    }
  }



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
        trade: this.workItemTrades()[item.id] ?? item.trade,
        description: this.workItemDescriptions()[item.id] ?? item.description,
        estimated_hours: number(this.workItemHours()[item.id], item.estimated_hours),
      })),
      materials: data.materials.map((item) => ({
        ...item,
        name: this.materialNames()[item.id] ?? item.name,
        description: this.materialDescriptions()[item.id] ?? item.description,
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
      this.latestMessageId();
      this.chatOpen();
      afterNextRender(() => {
        const messages = this.chatMessages()?.nativeElement;
        if (messages) messages.scrollTop = messages.scrollHeight;
      }, { injector: this.injector });
    });
  }

  private acknowledge(
    values: WritableSignal<Record<string, string>>,
    saved: Record<string, string | number | null>,
    numeric = false,
  ): void {
    const edits = values();
    const remaining = Object.entries(edits).filter(([id, raw]) => {
      const value = numeric ? (raw.trim() === '' ? null : Number(raw)) : raw;
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
    this.historyDialog().nativeElement.close();
    void this.router.navigate(['/offers', offerId]);
  }

  async editDraftText(edit: DraftTextEdit): Promise<void> {
    if (!edit.save) {
      if (edit.kind === 'work') {
        if (edit.field === 'trade') this.setWorkItemTrade(edit.id, edit.value);
        else if (edit.field === 'hours') this.setWorkItemHours(edit.id, edit.value);
        else this.setWorkItemDescription(edit.id, edit.value);
      } else {
        if (edit.field === 'name') this.setMaterialName(edit.id, edit.value);
        else if (edit.field === 'quantity') this.setMaterialQuantity(edit.id, edit.value);
        else if (edit.field === 'unit') this.setMaterialUnit(edit.id, edit.value);
        else if (edit.field === 'unitPrice') this.setMaterialUnitPrice(edit.id, edit.value);
        else this.setMaterialDescription(edit.id, edit.value);
      }
      this.fieldEdited(this.fieldKey(edit.kind, edit.id, edit.field));
      return;
    }
    if (edit.kind === 'work') {
      const item = this.data().workItems.find(item => item.id === edit.id);
      if (!item) return;
      if (edit.field === 'trade') await this.saveWorkItemTrade(item, edit.value);
      else if (edit.field === 'hours') await this.updateEstimatedHours(item, edit.value);
      else await this.saveWorkItemDescription(item, edit.value);
    } else {
      const item = this.data().materials.find(item => item.id === edit.id);
      if (!item) return;
      if (edit.field === 'name') await this.saveMaterialName(item, edit.value);
      else if (edit.field === 'quantity') await this.updateMaterialQuantity(item, edit.value);
      else if (edit.field === 'unit') await this.updateMaterialUnit(item, edit.value);
      else if (edit.field === 'unitPrice') await this.updateMaterialUnitPrice(item, edit.value);
      else await this.saveMaterialDescription(item, edit.value);
    }
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
    this.finishTextEditing(this.fieldKey('work', item.id, 'trade'));
    const trade = value.trim();
    this.setWorkItemTrade(item.id, trade);

    if (trade === (item.trade ?? '')) {
      return;
    }

    try {
      await this.saveField(this.fieldKey('work', item.id, 'trade'), () =>
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
    this.finishTextEditing(this.fieldKey('work', item.id, 'description'));
    const description = value.trim();
    this.setWorkItemDescription(item.id, description);

    if (description === (item.description ?? '')) {
      return;
    }

    try {
      await this.saveField(this.fieldKey('work', item.id, 'description'), () =>
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
      await this.saveField(this.fieldKey('work', item.id, 'hours'), () =>
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
    this.finishTextEditing(this.fieldKey('material', material.id, 'name'));
    const name = value.trim();
    this.setMaterialName(material.id, name);

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
    this.finishTextEditing(this.fieldKey('material', material.id, 'description'));
    const description = value.trim();
    this.setMaterialDescription(material.id, description);

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
      await this.saveField(this.fieldKey('material', material.id, Object.keys(changes)[0]), () =>
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
