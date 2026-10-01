import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { supabase } from '../../core/supabase/supabase.client';
import { ProjectService } from '../../core/projects/project.service';
import { OfferPreview } from '../../shared/components/offer-preview/offer-preview.component';
import { ProjectSidebar } from '../../shared/components/project-sidebar/project-sidebar.component';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, ReactiveFormsModule, OfferPreview, ProjectSidebar],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);

  readonly project = signal<ProjectData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly projects = signal<Awaited<ReturnType<ProjectService['getProjects']>>>([]);
  readonly isCreatingProject = signal(false);
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

      // Undgå at vise et projekt, vi allerede har forladt.
      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
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

  async createProject(): Promise<void> {
    if (this.isCreatingProject()) {
      return;
    }

    this.isCreatingProject.set(true);
    this.errorMessage.set('');

    try {
      const project = await this.projectService.createProject();

      await this.loadProjects();
      await this.router.navigate(['/projects', project.id]);
    } catch (error) {
      console.error('Could not create project:', error);
      this.errorMessage.set('Kunne ikke oprette projektet.');
    } finally {
      this.isCreatingProject.set(false);
    }
  }

  async refreshProject(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    try {
      // ÆNDRET: Hent både projektet og den opdaterede projektliste.
      const [data, projects] = await Promise.all([
        this.projectService.getProject(projectId),
        this.projectService.getProjects(),
      ]);

      // Undgå at vise data fra et projekt, vi har forladt.
      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.project.set(data);

      // NYT: Opdater dropdownen.
      this.projects.set(projects);
    } catch (error) {
      console.error('Could not refresh project:', error);
      this.errorMessage.set('Kunne ikke opdatere projektet.');
    }
  }

  // NYT: Start redigering
  startEditingTitle(): void {
    const title = this.project()?.project.title ?? '';

    this.titleControl.setValue(title);
    this.titleError.set('');
    this.isEditingTitle.set(true);
  }

  // NYT: Annuller redigering
  cancelEditingTitle(): void {
    this.isEditingTitle.set(false);
    this.titleError.set('');
  }

  // NYT: Gem titel og marker den som brugerredigeret
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

      await Promise.all([this.refreshProject(), this.loadProjects()]);
    } catch (error) {
      console.error('Could not save project title:', error);
      this.titleError.set('Kunne ikke gemme projekttitlen.');
    } finally {
      this.isSavingTitle.set(false);
    }
  }

  // NYT: Opdater projekt og projektvælger efter gemning.
  async onDetailsSaved(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    try {
      const [data, projects] = await Promise.all([
        this.projectService.getProject(projectId),
        this.projectService.getProjects(),
      ]);

      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.project.set(data);
      this.projects.set(projects);
    } catch (error) {
      console.error('Could not refresh project details:', error);
      this.errorMessage.set('Kunne ikke opdatere projektvisningen.');
    }
  }
}
