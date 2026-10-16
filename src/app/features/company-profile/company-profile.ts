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
  imports: [ReactiveFormsModule],
  templateUrl: "./company-profile.html",
  styleUrl: "./company-profile.scss",
})
export class CompanyProfileComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly location = inject(Location);

  
  isLoading = signal(true);
  isSaving = signal(false);
  message = signal("");
  
  goBack(): void {
    this.location.back();
  }

  form = new FormGroup({
    companyName: new FormControl("", { nonNullable: true }),
    cvr: new FormControl("", { nonNullable: true }),
    contactName: new FormControl("", { nonNullable: true }),
    phone: new FormControl("", { nonNullable: true }),
    email: new FormControl("", { nonNullable: true }),
    defaultHourlyRate: new FormControl<number | null>(null),
    validityDays: new FormControl<number | null>(null, [Validators.min(1), Validators.pattern(/^\d+$/)]),
    paymentTerms: new FormControl('', { nonNullable: true }),
    reservations: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    try {
      const profile =
        await this.companyService.getCurrentCompanyProfile();

      if (profile) {
        this.form.setValue(profile);
      } else {
        this.message.set("Virksomhedsprofilen blev ikke fundet.");
      }
    } catch (error) {
      console.error(error);
      this.message.set("Kunne ikke hente virksomhedsprofilen.");
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    if (this.form.invalid) {
      this.message.set('Gyldighed skal være et helt antal dage på mindst 1, eller være tom.');
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
}