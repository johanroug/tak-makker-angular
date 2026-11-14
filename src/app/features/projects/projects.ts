import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/projects/project.service';
import { CompanyService } from '../../core/company/company.service';
import { WorkspaceState } from '../../shared/components/app-shell/workspace-state';
import { WorkspaceIcon } from '../../shared/components/workspace-icon.component';
import { offerStatusLabel } from '../../core/offers/offer-status';

type Project = Awaited<ReturnType<ProjectService['getOverviewProjects']>>[number];
type Filter = 'recent' | 'all' | 'finished' | 'draft';

@Component({
  selector: 'app-projects',
  imports: [RouterLink, WorkspaceIcon],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly companyService = inject(CompanyService);
  readonly workspace = inject(WorkspaceState);
  readonly projects = signal<Project[]>([]);
  readonly customerCount = signal<number | null>(null);
  readonly firstName = signal('');
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly filter = signal<Filter>('recent');
  readonly finishedCount = computed(() => this.projects().filter(p => p.offers.length > 0).length);
  readonly draftCount = computed(() => this.projects().filter(p => !p.offers.length).length);
  readonly visibleProjects = computed(() => {
    const projects = this.projects();
    switch (this.filter()) {
      case 'recent': return projects.slice(0, 5);
      case 'finished': return projects.filter(p => p.offers.length > 0);
      case 'draft': return projects.filter(p => !p.offers.length);
      default: return projects;
    }
  });
  readonly listTitle = computed(() => ({ recent: 'Seneste projekter', all: 'Alle projekter', finished: 'Projekter med færdige tilbud', draft: 'Udkast' })[this.filter()]);
  readonly statusLabel = offerStatusLabel;

  ngOnInit(): void {
    void this.loadProjects();
    void this.companyService.getCurrentContactName().then(name => {
      this.firstName.set(name.trim().split(/\s+/)[0] ?? '');
    }).catch(() => {});
    void this.projectService.getCustomerCount().then(count => this.customerCount.set(count)).catch(() => {});
  }

  async loadProjects(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try { this.projects.set(await this.projectService.getOverviewProjects()); }
    catch { this.errorMessage.set('Kunne ikke hente projekterne. Prøv igen.'); }
    finally { this.isLoading.set(false); }
  }
}
