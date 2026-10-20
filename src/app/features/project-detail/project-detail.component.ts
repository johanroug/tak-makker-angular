import { Component, inject, OnInit, OnDestroy, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { supabase } from '../../core/supabase/supabase.client';
import { ProjectService } from '../../core/projects/project.service';
import { OfferPreview } from '../../shared/components/offer-preview/offer-preview.component';
import { ProjectSidebar } from '../../shared/components/project-sidebar/project-sidebar.component';
import { NewProjectDialog } from '../../shared/components/new-project-dialog/new-project-dialog.component';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, ReactiveFormsModule, OfferPreview, ProjectSidebar, NewProjectDialog],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);

  private readonly sidebar = viewChild(ProjectSidebar);
  private readonly newProjectDialog = viewChild.required(NewProjectDialog);

  readonly project = signal<ProjectData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly projects = signal<Awaited<ReturnType<ProjectService['getProjects']>>>([]);
  readonly newProjectId = signal<string | null>(null);
  readonly isEditingTitle = signal(false);
  readonly isSavingTitle = signal(false);
  readonly titleError = signal('');

  readonly titleControl = new FormControl('', {
    nonNullable: true,
  });

  readonly projectControl = new FormControl('', {
    nonNullable: true,
  });

  private routeSubscription?: Subscription;

  ngOnInit(): void {
    void this.loadProjects();

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId') ?? '';

      this.projectControl.setValue(projectId, { emitEvent: false });

      this.isEditingTitle.set(false);
      this.titleError.set('');

      if (projectId) {
        void this.loadProject(projectId);
      } else {
        this.project.set(null);
        this.errorMessage.set('');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  async loadProject(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.project.set(null);

    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.newProjectId.set(
          this.route.snapshot.queryParamMap.get('editDetails') === '1' ? projectId : null,
        );
        this.project.set(data);
      }
    } catch (error) {
      console.error('Could not load project:', error);

      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.errorMessage.set('Kunne ikke hente projektet.');
      }
    } finally {
      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.isLoading.set(false);
      }
    }
  }

  async loadProjects(): Promise<void> {
    try {
      const projects = await this.projectService.getProjects();
      this.projects.set(projects);
    } catch (error) {
      console.error('Could not load project list:', error);
    }
  }

  selectProject(projectId: string): void {
    if (projectId) {
      void this.router.navigate(['/projects', projectId]);
    }
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Could not sign out:', error);
      this.errorMessage.set('Kunne ikke logge ud.');
      return;
    }

    await this.router.navigate(['/login']);
  }

  createProject(): void {
    this.newProjectDialog().open();
  }

  onDetailsOpened(): void {
    this.newProjectId.set(null);
    if (this.route.snapshot.queryParamMap.get('editDetails') === '1') {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editDetails: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  async refreshProject(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.onAiCompleted(data);
    } catch (error) {
      console.error('Could not refresh project:', error);
      this.errorMessage.set('Kunne ikke opdatere projektet.');
    }
  }

  onAiCompleted(data: ProjectData): void {
    if (this.route.snapshot.paramMap.get('projectId') !== data.project.id) return;
    this.project.set(data);
    this.projects.update((projects) =>
      projects.map((project) =>
        project.id === data.project.id
          ? {
              ...project,
              title: data.project.title,
              customer_name: data.project.customer_name,
              customer_address: data.project.customer_address,
            }
          : project,
      ),
    );
  }

  startEditingTitle(): void {
    const title = this.project()?.project.title ?? '';

    this.titleControl.setValue(title);
    this.titleError.set('');
    this.isEditingTitle.set(true);
  }

  cancelEditingTitle(): void {
    this.isEditingTitle.set(false);
    this.titleError.set('');
  }

  async saveTitle(): Promise<void> {
    const projectId = this.project()?.project.id;
    const title = this.titleControl.value.trim();

    if (!projectId || !title || this.isSavingTitle()) {
      return;
    }

    this.isSavingTitle.set(true);
    this.titleError.set('');

    try {
      await this.projectService.updateProjectTitle(projectId, title);

      this.isEditingTitle.set(false);

      await this.refreshProject();
    } catch (error) {
      console.error('Could not save project title:', error);
      this.titleError.set('Kunne ikke gemme projekttitlen.');
    } finally {
      this.isSavingTitle.set(false);
    }
  }

  async onDetailsSaved(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.onAiCompleted(data);
    } catch (error) {
      console.error('Could not refresh project details:', error);
      this.errorMessage.set('Kunne ikke opdatere projektvisningen.');
    }
  }

  async onOfferFinalized(): Promise<void> {
    const sidebar = this.sidebar();

    if (sidebar?.activeTab() === 'offers') {
      await sidebar.loadOffers();
    }
  }
}
