
import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProjectService } from '../../../core/projects/project.service';
import { AiService } from '../../../core/ai/ai.service';

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

  // ÆNDRET: Samtale er standardfanen.
  readonly activeTab = signal<SidebarTab>('chat');

  readonly isSending = signal(false);
  readonly sendError = signal('');

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  selectTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }

  // NYT: Nyeste beskeder vises først.
  // Vi ændrer ikke rækkefølgen i databasen.
  get newestMessages() {
    return [...this.data().messages].reverse();
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
      await this.projectService.saveAiWorkItems(
        projectId,
        aiResponse.workItems,
      );

      // Gem materialer.
      await this.projectService.saveAiMaterials(
        projectId,
        aiResponse.materials,
      );

      // Gem kunde- og projektoplysninger.
      await this.projectService.saveAiProjectDetails(
        projectId,
        aiResponse,
      );

      // Opdater brugerfladen.
      this.messageAdded.emit();

      // Omdan spørgsmålene til en chatbesked.
      const assistantMessage = aiResponse.questions
        .map((question, index) => `${index + 1}. ${question}`)
        .join('\n\n');

      if (assistantMessage) {
        await this.projectService.addAssistantMessage(
          projectId,
          assistantMessage,
        );

        // Opdater chatten med den nye besked.
        this.messageAdded.emit();
      }
    } catch (error) {
      console.error(error);

      this.sendError.set(
        'Der opstod en fejl. Kontrollér chatten, før du prøver igen.',
      );
    } finally {
      this.isSending.set(false);
    }
  }
}