import { PageLoading } from '../../shared/components/page-loading/page-loading.component';
import { Component, inject, OnInit, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import {
  CompanyService,
  type CompanyProfile,
} from "../../core/company/company.service";
import { Location } from "@angular/common";

@Component({
  selector: "app-company-profile",
  imports: [PageLoading, ReactiveFormsModule],
  templateUrl: "./company-profile.html",
  styleUrl: "./company-profile.scss",
})
export class CompanyProfileComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly location = inject(Location);

  
  isLoading = signal(true);
  isSaving = signal(false);
  message = signal("");
  hasProfile = signal(false);
  isProcessingLogo = signal(false);
  logoError = signal('');
  
  goBack(): void {
    this.location.back();
  }

  form = new FormGroup({
    companyName: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    address: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    logoDataUrl: new FormControl<string | null>(null),
    cvr: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{8}$/)] }),
    contactName: new FormControl("", { nonNullable: true }),
    phone: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^(?=(?:\D*\d){6,15}\D*$)\+?[\d\s().-]{6,25}$/)] }),
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
    defaultHourlyRate: new FormControl<number | null>(null, Validators.min(0)),
    validityDays: new FormControl<number | null>(null, [Validators.min(1), Validators.pattern(/^\d+$/)]),
    paymentTerms: new FormControl('', { nonNullable: true }),
    reservations: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void { void this.loadProfile(); }

  private loadingProfile = false;
  async loadProfile(): Promise<void> {
    if (this.loadingProfile || this.hasProfile()) return;
    this.loadingProfile = true;
    this.isLoading.set(true);
    this.message.set('');
    try {
      const profile =
        await this.companyService.getCurrentCompanyProfile();

      if (profile) {
        this.form.setValue({ ...profile, logoDataUrl: profile.logoDataUrl ?? null });
        this.hasProfile.set(true);
      } else {
        this.message.set("Virksomhedsprofilen blev ikke fundet.");
      }
    } catch (error) {
      console.error(error);
      this.message.set("Kunne ikke hente virksomhedsprofilen.");
    } finally {
      this.isLoading.set(false);
      this.loadingProfile = false;
    }
  }

  async save(): Promise<void> {
    if (this.isSaving() || this.isProcessingLogo() || this.isLoading() || !this.hasProfile()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Kontrollér felterne nedenfor, før du gemmer.');
      return;
    }

    this.isSaving.set(true);
    this.message.set("");

    try {
      const profile: CompanyProfile = this.form.getRawValue();

      await this.companyService.updateCurrentCompanyProfile(profile);

      this.message.set("Virksomhedsprofilen er gemt.");
    } catch (error) {
      console.error(error);
      this.message.set("Kunne ikke gemme virksomhedsprofilen.");
    } finally {
      this.isSaving.set(false);
    }
  }

  async selectLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isSaving() || this.isProcessingLogo()) return;

    this.logoError.set('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      this.logoError.set('Vælg en PNG- eller JPG-fil på højst 2 MB.');
      return;
    }

    this.isProcessingLogo.set(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 25_000_000) {
        throw new Error('Billedet er for stort. Vælg et logo med højst 25 millioner pixels.');
      }
      const scale = Math.min(1, 600 / image.naturalWidth, 240 / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browseren kunne ikke behandle logoet.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl.length > 300_000) throw new Error('Logoet fylder for meget efter komprimering. Vælg et enklere eller mindre billede.');
      this.form.controls.logoDataUrl.setValue(dataUrl);
      this.form.controls.logoDataUrl.markAsDirty();
      this.message.set('Logoet er klar. Tryk Gem ændringer for at gemme det.');
    } catch (error) {
      this.logoError.set(error instanceof Error ? error.message : 'Kunne ikke læse billedet. Prøv en anden PNG- eller JPG-fil.');
    } finally {
      URL.revokeObjectURL(url);
      this.isProcessingLogo.set(false);
    }
  }

  removeLogo(): void {
    if (this.isSaving() || this.isProcessingLogo()) return;
    this.form.controls.logoDataUrl.setValue(null);
    this.form.controls.logoDataUrl.markAsDirty();
    this.logoError.set('');
    this.message.set('Tryk Gem ændringer for at fjerne logoet.');
  }
}
