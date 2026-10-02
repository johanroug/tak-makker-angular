import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';
import { Router } from '@angular/router';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type EditableDetails = {
  customerName: string;
  customerAddress: string;
  title: string;
  description: string;
  offerDescription: string;
};

@Component({
  selector: 'app-offer-preview',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './offer-preview.component.html',
  styleUrl: './offer-preview.component.scss',
})
export class OfferPreview {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly data = input.required<ProjectData>();

  readonly detailsSaved = output<void>();

  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');

  readonly isFinalizing = signal(false);
  readonly finalizeError = signal('');
  readonly finalizedOfferNumber = signal<string | null>(null);

  readonly finalizedOfferId = signal<string | null>(null);

  private originalDetails: EditableDetails | null = null;

  readonly detailsForm = new FormGroup({
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

  get acceptedMaterials() {
    return this.data().materials.filter((material) => material.status === 'accepted');
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

  get canFinalizeOffer(): boolean {
    const project = this.data().project;

    if (this.isFinalizing()) {
      return false;
    }

    if (this.finalizedOfferNumber()) {
      return false;
    }

    if (!project.title?.trim()) {
      return false;
    }

    if (!project.customer_name?.trim()) {
      return false;
    }

    if (!project.customer_address?.trim()) {
      return false;
    }

    if (!project.description?.trim()) {
      return false;
    }

    if (project.hourly_rate === null || project.hourly_rate < 0) {
      return false;
    }

    if (this.acceptedWorkItems.length === 0 && this.acceptedMaterials.length === 0) {
      return false;
    }

    const workItemsAreValid = this.acceptedWorkItems.every(
      (item) =>
        !!item.trade?.trim() &&
        !!item.description?.trim() &&
        item.estimated_hours !== null &&
        item.estimated_hours >= 0,
    );

    if (!workItemsAreValid) {
      return false;
    }

    const materialsAreValid = this.acceptedMaterials.every(
      (material) =>
        !!material.name?.trim() &&
        !!material.description?.trim() &&
        material.quantity !== null &&
        material.quantity >= 0 &&
        !!material.unit?.trim() &&
        material.unit_price !== null &&
        material.unit_price >= 0,
    );

    return materialsAreValid;
  }

  get finalizeDisabledReason(): string {
    const project = this.data().project;

    if (!project.title?.trim()) {
      return 'Projekttitel mangler';
    }

    if (!project.customer_name?.trim()) {
      return 'Kundenavn mangler';
    }

    if (!project.customer_address?.trim()) {
      return 'Kundeadresse mangler';
    }

    if (!project.description?.trim()) {
      return 'Projektbeskrivelse mangler';
    }

    if (project.hourly_rate === null || project.hourly_rate < 0) {
      return 'Projektets timepris mangler';
    }

    if (this.acceptedWorkItems.length === 0 && this.acceptedMaterials.length === 0) {
      return 'Acceptér mindst én arbejdsopgave eller ét materiale';
    }

    return '';
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
    } catch (error) {
      console.error('Could not finalize offer:', error);

      this.finalizeError.set(
        error instanceof Error ? error.message : 'Kunne ikke færdiggøre tilbuddet.',
      );
    } finally {
      this.isFinalizing.set(false);
    }
  }

  startEditing(): void {
    const project = this.data().project;

    this.originalDetails = {
      customerName: project.customer_name ?? '',
      customerAddress: project.customer_address ?? '',
      title: project.title ?? '',
      description: project.description ?? '',
      offerDescription: project.offer_description ?? '',
    };

    this.detailsForm.setValue(this.originalDetails);

    this.saveError.set('');
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    if (this.isSaving()) {
      return;
    }

    this.isEditing.set(false);
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
