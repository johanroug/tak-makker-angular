import { Component, inject, OnInit, signal } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/projects/project.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);

  readonly project = signal<ProjectData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId');

    if (!projectId) {
      this.errorMessage.set('Projekt-ID mangler.');
      this.isLoading.set(false);
      return;
    }

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
}
