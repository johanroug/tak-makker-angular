import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';

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
  imports: [ReactiveFormsModule],
  templateUrl: './offer-preview.component.html',
  styleUrl: './offer-preview.component.scss',
})
export class OfferPreview {
  private readonly projectService = inject(ProjectService);

  readonly data = input.required<ProjectData>();

  // NYT: Giv forælderen besked, når oplysninger er gemt.
  readonly detailsSaved = output<void>();

  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');

  private originalDetails: EditableDetails | null = null;

  readonly detailsForm = new FormGroup({
    customerName: new FormControl('', { nonNullable: true }),
    customerAddress: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    offerDescription: new FormControl('', { nonNullable: true }),
  });

  // NYT: Åbn redigering med projektets aktuelle værdier.
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

  // NYT: Gem kun de felter, der faktisk er ændret.
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

    // Projekttitlen skal fortsat være udfyldt.
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
}
