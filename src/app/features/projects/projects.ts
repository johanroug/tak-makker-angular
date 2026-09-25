import { Component, inject, OnInit } from "@angular/core";
import {
  CompanyService,
  type CompanyProfile,
} from "../../core/company/company.service";

@Component({
  selector: "app-projects",
  imports: [],
  templateUrl: "./projects.html",
  styleUrl: "./projects.scss",
})
export class Projects implements OnInit {
  private readonly companyService = inject(CompanyService);

  companyProfile: CompanyProfile | null = null;

  async ngOnInit() {
    this.companyProfile =
      await this.companyService.getCurrentCompanyProfile();

    console.log("Company profile:", this.companyProfile);
  }
}