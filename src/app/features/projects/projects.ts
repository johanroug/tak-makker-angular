import { Component, inject, OnInit, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { ProjectService } from '../../core/projects/project.service';
import { CompanyProfileComponent } from '../company-profile/company-profile';

type Project = Awaited<ReturnType<ProjectService['getProjects']>>[number];

@Component({
  selector: 'app-projects',
  imports: [RouterLink, CompanyProfileComponent],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private readonly projectService = inject(ProjectService);

  projects = signal<Project[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const projects = await this.projectService.getProjects();

      this.projects.set(projects);
    } catch (error) {
      console.error('Could not load projects:', error);
      this.errorMessage.set('Kunne ikke hente projekterne.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
