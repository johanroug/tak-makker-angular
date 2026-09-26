import { Component, inject, input, output, signal } from '@angular/core';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type SidebarTab = 'tasks' | 'materials' | 'chat';

@Component({
  selector: 'app-project-sidebar',
  imports: [ReactiveFormsModule],
  templateUrl: './project-sidebar.component.html',
  styleUrl: './project-sidebar.component.scss',
})
export class ProjectSidebar {
  readonly data = input.required<ProjectData>();

  readonly messageAdded = output<void>();

  readonly activeTab = signal<SidebarTab>('tasks');
  readonly isSending = signal(false);
  readonly sendError = signal('');

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  private readonly projectService = inject(ProjectService);

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }

  async sendMessage(): Promise<void> {
    console.log("Angular sendMessage blev kaldt");
    const content = this.messageControl.value.trim();

    if (!content || this.isSending()) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set('');

    try {
      await this.projectService.addMessage(this.data().project.id, content);

      this.messageControl.reset();
      this.messageAdded.emit();
    } catch (error) {
      console.error('Could not send message:', error);
      this.sendError.set('Kunne ikke sende beskeden.');
    } finally {
      this.isSending.set(false);
    }
  }
}
