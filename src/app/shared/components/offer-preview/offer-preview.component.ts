import { Component, input } from '@angular/core';
import { ProjectService } from '../../../core/projects/project.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-offer-preview',
  imports: [],
  templateUrl: './offer-preview.component.html',
  styleUrl: './offer-preview.component.scss',
})
export class OfferPreview {
  readonly data = input.required<ProjectData>();
}
