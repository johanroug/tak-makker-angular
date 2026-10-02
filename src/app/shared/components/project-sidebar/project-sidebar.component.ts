import { DecimalPipe } from '@angular/common';
import {
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';

type ProjectData = Awaited<
  ReturnType<ProjectService['getProject']>
>;

type SidebarTab = 'tasks' | 'materials' | 'chat';

@Component({
  selector: 'app-project-sidebar',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './project-sidebar.component.html',
  styleUrl: './project-sidebar.component.scss',
})
export class ProjectSidebar {
  readonly data = input.required<ProjectData>();

  private readonly aiService = inject(AiService);
  private readonly projectService =
    inject(ProjectService);

  readonly messageAdded = output<void>();

  readonly activeTab =
    signal<SidebarTab>('chat');

  readonly isSending = signal(false);
  readonly sendError = signal('');

  readonly workItemTrades =
    signal<Record<string, string>>({});

  readonly workItemDescriptions =
    signal<Record<string, string>>({});

  readonly workItemHours =
    signal<Record<string, string>>({});

  readonly materialNames =
    signal<Record<string, string>>({});

  readonly materialDescriptions =
    signal<Record<string, string>>({});

  readonly materialQuantities =
    signal<Record<string, string>>({});

  readonly materialUnits =
    signal<Record<string, string>>({});

  readonly materialUnitPrices =
    signal<Record<string, string>>({});

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }

  get newestMessages() {
    return [...this.data().messages].reverse();
  }

  setWorkItemTrade(
    workItemId: string,
    value: string,
  ): void {
    this.workItemTrades.update((values) => ({
      ...values,
      [workItemId]: value,
    }));
  }

  getWorkItemTrade(
    item: ProjectData['workItems'][number],
  ): string {
    const localValue =
      this.workItemTrades()[item.id];

    return localValue !== undefined
      ? localValue
      : (item.trade ?? '');
  }

  async saveWorkItemTrade(
    item: ProjectData['workItems'][number],
    value: string,
  ): Promise<void> {
    const trade = value.trim();

    if (trade === (item.trade ?? '')) {
      return;
    }

    try {
      await this.projectService.updateWorkItem(
        this.data().project.id,
        item.id,
        { trade },
      );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update work item trade:',
        error,
      );
    }
  }

  setWorkItemDescription(
    workItemId: string,
    value: string,
  ): void {
    this.workItemDescriptions.update(
      (values) => ({
        ...values,
        [workItemId]: value,
      }),
    );
  }

  getWorkItemDescription(
    item: ProjectData['workItems'][number],
  ): string {
    const localValue =
      this.workItemDescriptions()[item.id];

    return localValue !== undefined
      ? localValue
      : (item.description ?? '');
  }

  async saveWorkItemDescription(
    item: ProjectData['workItems'][number],
    value: string,
  ): Promise<void> {
    const description = value.trim();

    if (
      description === (item.description ?? '')
    ) {
      return;
    }

    try {
      await this.projectService.updateWorkItem(
        this.data().project.id,
        item.id,
        { description },
      );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update work item description:',
        error,
      );
    }
  }

  setWorkItemHours(
    workItemId: string,
    value: string,
  ): void {
    this.workItemHours.update((values) => ({
      ...values,
      [workItemId]: value,
    }));
  }

  getWorkItemHours(
    item: ProjectData['workItems'][number],
  ): string {
    const localValue =
      this.workItemHours()[item.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return item.estimated_hours === null
      ? ''
      : String(item.estimated_hours);
  }

  getWorkItemLaborCost(
    item: ProjectData['workItems'][number],
  ): number | null {
    const hoursValue =
      this.getWorkItemHours(item);

    const hourlyRate =
      this.data().project.hourly_rate;

    if (
      hoursValue === '' ||
      hourlyRate === null
    ) {
      return null;
    }

    const hours = Number(hoursValue);

    if (
      Number.isNaN(hours) ||
      hours < 0
    ) {
      return null;
    }

    return hours * hourlyRate;
  }

  canAcceptWorkItem(
    item: ProjectData['workItems'][number],
  ): boolean {
    const trade =
      this.getWorkItemTrade(item).trim();

    const description =
      this.getWorkItemDescription(item).trim();

    const hoursValue =
      this.getWorkItemHours(item);

    const hourlyRate =
      this.data().project.hourly_rate;

    if (
      !trade ||
      !description ||
      hoursValue === '' ||
      hourlyRate === null
    ) {
      return false;
    }

    const hours = Number(hoursValue);

    return (
      !Number.isNaN(hours) &&
      hours >= 0 &&
      hourlyRate >= 0
    );
  }

  async updateWorkItemStatus(
    workItemId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    const item = this.data().workItems.find(
      (workItem) =>
        workItem.id === workItemId,
    );

    if (
      status === 'accepted' &&
      (!item || !this.canAcceptWorkItem(item))
    ) {
      return;
    }

    try {
      await this.projectService.updateWorkItemStatus(
        this.data().project.id,
        workItemId,
        status,
      );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update work item status:',
        error,
      );
    }
  }

  async updateEstimatedHours(
    item: ProjectData['workItems'][number],
    value: string,
  ): Promise<void> {
    const estimatedHours =
      value === '' ? null : Number(value);

    if (
      estimatedHours !== null &&
      (Number.isNaN(estimatedHours) ||
        estimatedHours < 0)
    ) {
      return;
    }

    if (
      estimatedHours === item.estimated_hours
    ) {
      return;
    }

    try {
      await this.projectService
        .updateWorkItemEstimatedHours(
          this.data().project.id,
          item.id,
          estimatedHours,
        );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update estimated hours:',
        error,
      );
    }
  }

  setMaterialName(
    materialId: string,
    value: string,
  ): void {
    this.materialNames.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialName(
    material: ProjectData['materials'][number],
  ): string {
    const localValue =
      this.materialNames()[material.id];

    return localValue !== undefined
      ? localValue
      : (material.name ?? '');
  }

  async saveMaterialName(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const name = value.trim();

    if (name === (material.name ?? '')) {
      return;
    }

    await this.saveMaterialValues(
      material,
      { name },
    );
  }

  setMaterialDescription(
    materialId: string,
    value: string,
  ): void {
    this.materialDescriptions.update(
      (values) => ({
        ...values,
        [materialId]: value,
      }),
    );
  }

  getMaterialDescription(
    material: ProjectData['materials'][number],
  ): string {
    const localValue =
      this.materialDescriptions()[material.id];

    return localValue !== undefined
      ? localValue
      : (material.description ?? '');
  }

  async saveMaterialDescription(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const description = value.trim();

    if (
      description ===
      (material.description ?? '')
    ) {
      return;
    }

    await this.saveMaterialValues(
      material,
      { description },
    );
  }

  setMaterialQuantity(
    materialId: string,
    value: string,
  ): void {
    this.materialQuantities.update(
      (values) => ({
        ...values,
        [materialId]: value,
      }),
    );
  }

  getMaterialQuantity(
    material: ProjectData['materials'][number],
  ): string {
    const localValue =
      this.materialQuantities()[material.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return material.quantity === null
      ? ''
      : String(material.quantity);
  }

  setMaterialUnit(
    materialId: string,
    value: string,
  ): void {
    this.materialUnits.update((values) => ({
      ...values,
      [materialId]: value,
    }));
  }

  getMaterialUnit(
    material: ProjectData['materials'][number],
  ): string {
    const localValue =
      this.materialUnits()[material.id];

    return localValue !== undefined
      ? localValue
      : (material.unit ?? '');
  }

  setMaterialUnitPrice(
    materialId: string,
    value: string,
  ): void {
    this.materialUnitPrices.update(
      (values) => ({
        ...values,
        [materialId]: value,
      }),
    );
  }

  getMaterialUnitPrice(
    material: ProjectData['materials'][number],
  ): string {
    const localValue =
      this.materialUnitPrices()[material.id];

    if (localValue !== undefined) {
      return localValue;
    }

    return material.unit_price === null
      ? ''
      : String(material.unit_price);
  }

  getMaterialTotal(
    material: ProjectData['materials'][number],
  ): number | null {
    const quantityValue =
      this.getMaterialQuantity(material);

    const unitPriceValue =
      this.getMaterialUnitPrice(material);

    if (
      quantityValue === '' ||
      unitPriceValue === ''
    ) {
      return null;
    }

    const quantity = Number(quantityValue);
    const unitPrice = Number(unitPriceValue);

    if (
      Number.isNaN(quantity) ||
      Number.isNaN(unitPrice) ||
      quantity < 0 ||
      unitPrice < 0
    ) {
      return null;
    }

    return quantity * unitPrice;
  }

  canAcceptMaterial(
    material: ProjectData['materials'][number],
  ): boolean {
    const name =
      this.getMaterialName(material).trim();

    const description =
      this.getMaterialDescription(
        material,
      ).trim();

    const quantityValue =
      this.getMaterialQuantity(material);

    const unit =
      this.getMaterialUnit(material).trim();

    const unitPriceValue =
      this.getMaterialUnitPrice(material);

    if (
      !name ||
      !description ||
      quantityValue === '' ||
      !unit ||
      unitPriceValue === ''
    ) {
      return false;
    }

    const quantity = Number(quantityValue);
    const unitPrice = Number(unitPriceValue);

    return (
      !Number.isNaN(quantity) &&
      quantity >= 0 &&
      !Number.isNaN(unitPrice) &&
      unitPrice >= 0
    );
  }

  async updateMaterialStatus(
    materialId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    const material =
      this.data().materials.find(
        (item) => item.id === materialId,
      );

    if (
      status === 'accepted' &&
      (!material ||
        !this.canAcceptMaterial(material))
    ) {
      return;
    }

    try {
      await this.projectService
        .updateMaterialStatus(
          this.data().project.id,
          materialId,
          status,
        );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update material status:',
        error,
      );
    }
  }

  async updateMaterialQuantity(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const quantity =
      value === '' ? null : Number(value);

    if (
      quantity !== null &&
      (Number.isNaN(quantity) ||
        quantity < 0)
    ) {
      return;
    }

    if (quantity === material.quantity) {
      return;
    }

    await this.saveMaterialValues(
      material,
      { quantity },
    );
  }

  async updateMaterialUnit(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const unit = value.trim();

    if (unit === (material.unit ?? '')) {
      return;
    }

    await this.saveMaterialValues(
      material,
      { unit },
    );
  }

  async updateMaterialUnitPrice(
    material: ProjectData['materials'][number],
    value: string,
  ): Promise<void> {
    const unitPrice =
      value === '' ? null : Number(value);

    if (
      unitPrice !== null &&
      (Number.isNaN(unitPrice) ||
        unitPrice < 0)
    ) {
      return;
    }

    if (
      unitPrice === material.unit_price
    ) {
      return;
    }

    await this.saveMaterialValues(
      material,
      { unitPrice },
    );
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
      await this.projectService.updateMaterial(
        this.data().project.id,
        material.id,
        changes,
      );

      this.messageAdded.emit();
    } catch (error) {
      console.error(
        'Could not update material:',
        error,
      );
    }
  }

  async sendMessage(): Promise<void> {
    const message =
      this.messageControl.value.trim();

    const projectId =
      this.data().project.id;

    if (!message || this.isSending()) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set('');

    try {
      await this.projectService.addMessage(
        projectId,
        message,
      );

      this.messageControl.reset();
      this.messageAdded.emit();

      const aiResponse =
        await this.aiService.generateOffer(
          projectId,
        );

      await this.projectService.saveAiWorkItems(
        projectId,
        aiResponse.workItems,
      );

      await this.projectService.saveAiMaterials(
        projectId,
        aiResponse.materials,
      );

      await this.projectService
        .saveAiProjectDetails(
          projectId,
          aiResponse,
        );

      this.messageAdded.emit();

      const assistantMessage =
        aiResponse.questions
          .map(
            (question, index) =>
              `${index + 1}. ${question}`,
          )
          .join('\n\n');

      if (assistantMessage) {
        await this.projectService
          .addAssistantMessage(
            projectId,
            assistantMessage,
          );

        this.messageAdded.emit();
      }
    } catch (error) {
      console.error(error);

      this.sendError.set(
        'Der opstod en fejl. Kontrollér chatten, før du prøver igen.',
      );
    } finally {
      this.isSending.set(false);
    }
  }
}