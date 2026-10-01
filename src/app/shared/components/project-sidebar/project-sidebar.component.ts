import { DecimalPipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

type SidebarTab = 'tasks' | 'materials' | 'chat';

@Component({
  selector: 'app-project-sidebar',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './project-sidebar.component.html',
  styleUrl: './project-sidebar.component.scss',
})
export class ProjectSidebar {
  readonly data = input.required<ProjectData>();

  private readonly aiService = inject(AiService);
  private readonly projectService = inject(ProjectService);

  readonly messageAdded = output<void>();

  readonly activeTab = signal<SidebarTab>('chat');
  readonly isSending = signal(false);
  readonly sendError = signal('');

  readonly editingWorkItemId = signal<string | null>(null);
  readonly editTrade = signal('');
  readonly editDescription = signal('');

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }

  get newestMessages() {
    return [...this.data().messages].reverse();
  }

  async updateWorkItemStatus(workItemId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const projectId = this.data().project.id;

    try {
      await this.projectService.updateWorkItemStatus(projectId, workItemId, status);

      this.messageAdded.emit();
    } catch (error) {
      console.error('Could not update work item status:', error);
    }
  }

  async updateEstimatedHours(item: ProjectData['workItems'][number], value: string): Promise<void> {
    const estimatedHours = value === '' ? null : Number(value);

    if (estimatedHours === item.estimated_hours) {
      return;
    }

    if (estimatedHours !== null && (Number.isNaN(estimatedHours) || estimatedHours < 0)) {
      return;
    }

    try {
      await this.projectService.updateWorkItemEstimatedHours(
        this.data().project.id,
        item.id,
        estimatedHours,
      );

      this.messageAdded.emit();
    } catch (error) {
      console.error('Could not update estimated hours:', error);
    }
  }

  startEditingWorkItem(item: ProjectData['workItems'][number]): void {
    this.editingWorkItemId.set(item.id);
    this.editTrade.set(item.trade ?? '');
    this.editDescription.set(item.description ?? '');
  }

  cancelEditingWorkItem(): void {
    this.editingWorkItemId.set(null);
  }

  async saveWorkItem(workItemId: string): Promise<void> {
    const projectId = this.data().project.id;

    try {
      await this.projectService.updateWorkItem(projectId, workItemId, {
        trade: this.editTrade(),
        description: this.editDescription(),
      });

      this.editingWorkItemId.set(null);
      this.messageAdded.emit();
    } catch (error) {
      console.error('Could not update work item:', error);
    }
  }

  async sendMessage(): Promise<void> {
    const message = this.messageControl.value.trim();
    const projectId = this.data().project.id;

    if (!message || this.isSending()) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set('');

    try {
      await this.projectService.addMessage(projectId, message);

      this.messageControl.reset();
      this.messageAdded.emit();

      const aiResponse = await this.aiService.generateOffer(projectId);

      await this.projectService.saveAiWorkItems(projectId, aiResponse.workItems);

      await this.projectService.saveAiMaterials(projectId, aiResponse.materials);

      await this.projectService.saveAiProjectDetails(projectId, aiResponse);

      this.messageAdded.emit();

      const assistantMessage = aiResponse.questions
        .map((question, index) => `${index + 1}. ${question}`)
        .join('\n\n');

      if (assistantMessage) {
        await this.projectService.addAssistantMessage(projectId, assistantMessage);

        this.messageAdded.emit();
      }
    } catch (error) {
      console.error(error);

      this.sendError.set('Der opstod en fejl. Kontrollér chatten, før du prøver igen.');
    } finally {
      this.isSending.set(false);
    }
  }
}
