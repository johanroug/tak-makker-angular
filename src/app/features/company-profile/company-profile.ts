import { Component, inject, OnInit, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";

import {
  CompanyService,
  type CompanyProfile,
} from "../../core/company/company.service";

@Component({
  selector: "app-company-profile",
  imports: [ReactiveFormsModule],
  templateUrl: "./company-profile.html",
  styleUrl: "./company-profile.scss",
})
export class CompanyProfileComponent implements OnInit {
  private readonly companyService = inject(CompanyService);

  isLoading = signal(true);
  isSaving = signal(false);
  message = signal("");

  form = new FormGroup({
    companyName: new FormControl("", { nonNullable: true }),
    cvr: new FormControl("", { nonNullable: true }),
    contactName: new FormControl("", { nonNullable: true }),
    phone: new FormControl("", { nonNullable: true }),
    email: new FormControl("", { nonNullable: true }),
    defaultHourlyRate: new FormControl<number | null>(null),
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