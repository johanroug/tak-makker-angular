import { Component, input, signal } from '@angular/core';
import { ProjectService } from '../../../core/projects/project.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type SidebarTab = 'tasks' | 'materials' | 'chat';

@Component({
  selector: 'app-project-sidebar',
  imports: [],
  templateUrl: './project-sidebar.component.html',
  styleUrl: './project-sidebar.component.scss',
})
export class ProjectSidebar {
  readonly data = input.required<ProjectData>();

  readonly activeTab = signal<SidebarTab>('tasks');

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }
}
