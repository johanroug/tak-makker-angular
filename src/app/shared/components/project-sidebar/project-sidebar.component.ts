import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';
import { supabase } from '../../../core/supabase/supabase.client';

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

  private readonly aiService = inject(AiService);
  private readonly projectService = inject(ProjectService);

  readonly messageAdded = output<void>();

  readonly activeTab = signal<SidebarTab>('chat');
  readonly isSending = signal(false);
  readonly sendError = signal('');
  readonly editingWorkItemId = signal<string | null>(null);
  readonly editTrade = signal('');
  readonly editDescription = signal('');
  readonly editEstimatedHours = signal<number | null>(null);

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

      // Hent projektdata igen i parent.
      this.messageAdded.emit();
    } catch (error) {
      console.error('Could not update work item status:', error);
    }
  }

  async updateWorkItem(
    projectId: string,
    workItemId: string,
    changes: {
      trade: string;
      description: string;
      estimatedHours: number | null;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('project_work_items')
      .update({
        trade: changes.trade.trim(),
        description: changes.description.trim(),
        estimated_hours: changes.estimatedHours,

        // Brugerens estimat må ikke senere overskrives af AI.
        estimated_hours_source: 'user',
      })
      .eq('project_id', projectId)
      .eq('id', workItemId);

    if (error) {
      throw new Error(`Kunne ikke opdatere arbejdsopgaven: ${error.message}`);
    }
  }

  startEditingWorkItem(item: ProjectData['workItems'][number]): void {
  this.editingWorkItemId.set(item.id);
  this.editTrade.set(item.trade ?? '');
  this.editDescription.set(item.description ?? '');
  this.editEstimatedHours.set(item.estimated_hours);
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
        estimatedHours: this.editEstimatedHours(),
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
      // Gem brugerens besked.
      await this.projectService.addMessage(projectId, message);

      this.messageControl.reset();
      this.messageAdded.emit();

      // Hent AI-svaret.
      const aiResponse = await this.aiService.generateOffer(projectId);

      // Gem arbejdsopgaver.
      await this.projectService.saveAiWorkItems(projectId, aiResponse.workItems);

      // Gem materialer.
      await this.projectService.saveAiMaterials(projectId, aiResponse.materials);

      // Gem kunde- og projektoplysninger.
      await this.projectService.saveAiProjectDetails(projectId, aiResponse);

      // Opdater brugerfladen.
      this.messageAdded.emit();

      // Omdan spørgsmålene til en chatbesked.
      const assistantMessage = aiResponse.questions
        .map((question, index) => `${index + 1}. ${question}`)
        .join('\n\n');

      if (assistantMessage) {
        await this.projectService.addAssistantMessage(projectId, assistantMessage);

        // Opdater chatten med den nye besked.
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
