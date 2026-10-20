import { Component, ElementRef, inject, OnDestroy, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiService } from '../../../core/ai/ai.service';
import type { ProjectResponse } from '../../../core/ai/project-response';
import { ProjectService } from '../../../core/projects/project.service';

@Component({
  selector: 'app-new-project-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './new-project-dialog.component.html',
  styleUrl: './new-project-dialog.component.scss',
})
export class NewProjectDialog implements OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly aiService = inject(AiService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('startDialog');

  readonly projectCreated = output<void>();
  readonly prompt = new FormControl('', { nonNullable: true });
  readonly isWorking = signal(false);
  readonly error = signal('');
  readonly projectId = signal<string | null>(null);
  readonly hasSavedMessage = signal(false);
  readonly loadingMessage = signal('Gør dit næste projekt klar…');

  private response: ProjectResponse | null = null;
  private isPrepared = false;
  private destroyed = false;
  private messageTimer?: ReturnType<typeof setInterval>;
  private readonly messages = [
    'Gør dit næste projekt klar…',
    'Finder den røde tråd i din opgave…',
    'Tænker i opgaver og materialer…',
    'Giver detaljerne lidt ekstra opmærksomhed…',
    'Fra god idé til godt overblik…',
    'Samler trådene til en stærk start…',
    'Dit projekt tager form…',
    'Lader din makker tage det første træk…',
    'Omsætter dine idéer til et brugbart overblik…',
    'Ser på de små ting, der gør en stor forskel…',
    'Giver opgaven et ekstra sæt digitale øjne…',
    'Holder styr på både helheden og detaljerne…',
    'Bygger bro mellem din idé og dit næste tilbud…',
    'Finder en god struktur til dit projekt…',
    'Får brikkerne til at passe sammen…',
    'Tænker et skridt videre, så du er godt på vej…',
    'Din makker har arbejdshandskerne på…',
    'Giver dine planer en flyvende start…',
    'Gør de løse idéer lidt mere håndgribelige…',
    'Tager første runde med projektets detaljer…',
    'Skaber plads til dit faglige overblik…',
    'Ser på opgaven fra flere vinkler…',
    'Fra de første tanker til noget, du kan arbejde videre med…',
    'Et godt tilbud begynder med et godt overblik…',
  ];

  open(): void {
    if (this.isWorking() || this.dialog().nativeElement.open) return;
    this.prompt.reset();
    this.error.set('');
    this.projectId.set(null);
    this.hasSavedMessage.set(false);
    this.response = null;
    this.isPrepared = false;
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    if (!this.isWorking()) this.dialog().nativeElement.close();
  }

  async continue(): Promise<void> {
    const description = this.prompt.value.trim();
    if (!description || this.isWorking()) return;

    this.isWorking.set(true);
    this.error.set('');
    this.startMessages();

    try {
      let projectId = this.projectId();
      if (!projectId) {
        const project = await this.projectService.createProject();
        if (this.destroyed) return;
        projectId = project.id;
        this.projectId.set(projectId);
        this.projectCreated.emit();
      }
      if (this.destroyed) return;

      if (!this.hasSavedMessage()) {
        await this.projectService.addMessage(projectId, description);
        if (this.destroyed) return;
        this.hasSavedMessage.set(true);
      }
      if (this.destroyed) return;

      if (!this.isPrepared) {
        this.response ??= await this.aiService.generateOffer(projectId);
        if (this.destroyed) return;
        await this.projectService.saveAiResponse(projectId, this.response);
        const questions = this.response.questions
          .map((question, index) => `${index + 1}. ${question}`)
          .join('\n\n');
        if (questions) await this.projectService.addAssistantMessage(projectId, questions);
        this.isPrepared = true;
      }
      if (this.destroyed) return;

      // Keep the intent in the URL so it also survives a new route component.
      this.projectCreated.emit();
      const navigated = await this.router.navigate(['/projects', projectId], {
        queryParams: { editDetails: '1' },
      });
      if (!navigated) throw new Error('Navigation blev afbrudt.');
      if (!this.destroyed) this.dialog().nativeElement.close();
    } catch (error) {
      console.error('Could not prepare new project:', error);
      if (!this.destroyed) {
        this.error.set(
          this.projectId()
            ? 'Vi kunne ikke gøre projektet helt klar. Kladden er gemt. Prøv igen, eller åbn kladden og fortsæt derfra.'
            : 'Projektet kunne ikke oprettes. Prøv igen om et øjeblik.',
        );
      }
    } finally {
      this.stopMessages();
      if (!this.destroyed) this.isWorking.set(false);
    }
  }

  async openDraft(): Promise<void> {
    const projectId = this.projectId();
    if (!projectId || this.isWorking()) return;
    try {
      const navigated = await this.router.navigate(['/projects', projectId]);
      if (navigated && !this.destroyed) this.close();
    } catch (error) {
      console.error('Could not open draft:', error);
      if (!this.destroyed) this.error.set('Kladden kunne ikke åbnes. Prøv igen.');
    }
  }

  private startMessages(): void {
    this.stopMessages();
    this.loadingMessage.set(this.messages[0]);
    this.messageTimer = setInterval(() => {
      const next = this.messages.filter((message) => message !== this.loadingMessage());
      this.loadingMessage.set(next[Math.floor(Math.random() * next.length)]);
    }, 1800);
  }

  private stopMessages(): void {
    if (this.messageTimer !== undefined) clearInterval(this.messageTimer);
    this.messageTimer = undefined;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopMessages();
  }
}
