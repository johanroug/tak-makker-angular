import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/projects/project.service';
import { OfferPreview } from '../../shared/components/offer-preview/offer-preview.component';
import { ProjectSidebar } from '../../shared/components/project-sidebar/project-sidebar.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, OfferPreview, ProjectSidebar],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);

  readonly project = signal<ProjectData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  private readonly router = inject(Router);

  readonly projects = signal<Awaited<ReturnType<ProjectService['getProjects']>>>([]);
  readonly isCreatingProject = signal(false);

  private routeSubscription?: Subscription;

  ngOnInit(): void {
    void this.loadProjects();

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');

      if (projectId) {
        void this.loadProject(projectId);
      } else {
        this.project.set(null);
        this.errorMessage.set('');
        this.isLoading.set(false);
      }
    });
  }

  async loadProject(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.project.set(null);

    try {
      const data = await this.projectService.getProject(projectId);
      this.project.set(data);
    } catch (error) {
      console.error('Could not load project:', error);
      this.errorMessage.set('Kunne ikke hente projektet.');
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
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
      const data = await this.projectService.getProject(projectId);

      // Undgå at vise data fra et projekt, vi har forladt.
      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.project.set(data);
      }
    } catch (error) {
      console.error('Could not refresh project:', error);
      this.errorMessage.set('Kunne ikke opdatere projektet.');
    }
  }
}
