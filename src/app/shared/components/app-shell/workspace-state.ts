import { Injectable, inject, signal } from '@angular/core';
import { ProjectService } from '../../../core/projects/project.service';

@Injectable()
export class WorkspaceState {
  private readonly projectService = inject(ProjectService);
  readonly projects = signal<Awaited<ReturnType<ProjectService['getProjects']>>>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly activeProjectId = signal('');

  async loadProjects(): Promise<void> {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set('');
    try {
      this.projects.set(await this.projectService.getProjects());
    } catch (error) {
      console.error('Could not load project list:', error);
      this.error.set('Projektlisten kunne ikke hentes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateProject(project: Awaited<ReturnType<ProjectService['getProject']>>['project']): void {
    this.projects.update((projects) =>
      projects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              title: project.title,
              customer_name: project.customer_name,
              customer_address: project.customer_address,
            }
          : item,
      ),
    );
  }
}
