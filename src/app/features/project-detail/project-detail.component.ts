import { PageLoading } from '../../shared/components/page-loading/page-loading.component';
import { ProjectTools } from '../../shared/components/project-tools/project-tools.component';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, OnInit, OnDestroy, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../core/projects/project.service';
import { OfferPreview } from '../../shared/components/offer-preview/offer-preview.component';
import { ProjectSidebar } from '../../shared/components/project-sidebar/project-sidebar.component';
import { WorkspaceState } from '../../shared/components/app-shell/workspace-state';
import { WorkspaceIcon } from '../../shared/components/workspace-icon.component';
import { AiFeedback } from '../../shared/components/ai-feedback/ai-feedback.component';
import { shouldShowSuggestionNotice } from '../../shared/components/ai-feedback/suggestion-notice';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;
type WorkspaceSection = 'chat' | 'tasks' | 'materials' | 'offer';

@Component({
  selector: 'app-project-detail',
  imports: [ProjectTools, PageLoading, ReactiveFormsModule, OfferPreview, ProjectSidebar, WorkspaceIcon, AiFeedback],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetail implements OnInit, OnDestroy {
  protected readonly shouldShowSuggestionNotice = shouldShowSuggestionNotice;
  get suggestionNotice() {
    const result = this.sidebar()?.aiResult();
    if (result) return result;
    const initial = this.workspace.initialAiNotice();
    return initial?.projectId === this.project()?.project.id ? initial?.summary : null;
  }
  dismissSuggestionNotice(): void {
    this.workspace.initialAiNotice.set(null);
    this.sidebar()?.dismissAiResult();
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);

  protected readonly sidebar = viewChild(ProjectSidebar);
  private readonly preview = viewChild(OfferPreview);
  private readonly injector = inject(Injector);
  readonly mobileSection = signal<WorkspaceSection>('tasks');
  readonly mobileSections = [
    { id: 'chat', label: 'Samtale', title: 'Samtale', icon: 'chat' },
    { id: 'tasks', label: 'Opgaver', title: 'Arbejdsopgaver', icon: 'wrench' },
    { id: 'materials', label: 'Materialer', title: 'Materialer', icon: 'materials' },
    { id: 'offer', label: 'Tilbud', title: 'Tilbud', icon: 'offers' },
  ] as const;
  readonly mobileTitle = computed(() => this.mobileSections.find(section => section.id === this.mobileSection())?.title);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const mobileLayout = window.matchMedia('(max-width: 900px)');
      let viewportWidth = viewport.width;
      let fullViewportHeight = viewport.height;
      let keyboardWasOpen = false;
      let frame = 0;
      const revealField = () => {
        frame = 0;
        if (viewport.scale !== 1) return;

        if (Math.abs(viewport.width - viewportWidth) > 1) {
          viewportWidth = viewport.width;
          fullViewportHeight = viewport.height;
          keyboardWasOpen = false;
        }

        const keyboardInset = Math.max(0, window.innerHeight - viewport.height);
        // Some browsers shrink the layout viewport too, so compare with the height before typing.
        fullViewportHeight = Math.max(fullViewportHeight, viewport.height);
        const keyboardHeight = Math.max(keyboardInset, fullViewportHeight - viewport.height);
        const keyboardClosed = keyboardWasOpen && keyboardHeight <= 80;
        if (keyboardClosed) keyboardWasOpen = false;

        const field = document.activeElement;
        if (!mobileLayout.matches || !(field instanceof HTMLElement) || !host.contains(field) ||
          !field.matches('input:not([readonly]), textarea:not([readonly])')) {
          if (!keyboardWasOpen) fullViewportHeight = viewport.height;
          return;
        }

        host.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
        if (keyboardHeight >= 120) keyboardWasOpen = true;
        if (keyboardClosed) {
          fullViewportHeight = viewport.height;
          field.blur();
          return;
        }

        const bounds = field.getBoundingClientRect();
        const visibleBottom = viewport.offsetTop + viewport.height - 16;
        const coveredHeight = Math.min(bounds.bottom - visibleBottom, bounds.top - viewport.offsetTop - 16);
        if (coveredHeight <= 0) return;

        if (field.closest('dialog[open]')) {
          field.scrollIntoView({ block: 'center', behavior: 'instant' });
        } else {
          window.scrollBy({ top: coveredHeight, behavior: 'instant' });
        }
      };
      const scheduleReveal = () => {
        if (!frame) frame = requestAnimationFrame(revealField);
      };

      host.addEventListener('focusin', scheduleReveal);
      viewport.addEventListener('resize', scheduleReveal);
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        host.removeEventListener('focusin', scheduleReveal);
        viewport.removeEventListener('resize', scheduleReveal);
      });
    });
  }

  countApprovedLines(items: ProjectData['workItems'] | ProjectData['materials']): number {
    return items.filter(item => item.status === 'accepted').length;
  }

  selectMobileSection(section: WorkspaceSection): void {
    if (this.mobileSection() === section) return;
    this.mobileSection.set(section);
    window.scrollTo({ top: 0 });
  }

  openSuggestion(tab: 'tasks' | 'materials' | 'chat'): void {
    if (tab === 'chat') this.mobileSection.set(tab);
    this.sidebar()?.openAiTarget(tab);
  }

  reviewItems(tab: 'tasks' | 'materials'): void {
    this.mobileSection.set(tab);
    afterNextRender(() => this.preview()?.revealSection(tab), { injector: this.injector });
  }
  editProjectDetails(): void {
    this.preview()?.startEditing();
  }
  private readonly workspace = inject(WorkspaceState);

  createProject(): void {
    this.workspace.requestNewProject();
  }

  readonly project = signal<ProjectData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly refreshError = signal('');
  readonly isRefreshing = signal(false);

  retryProject(): void {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if (projectId && !this.isLoading()) void this.loadProject(projectId);
  }
  readonly newProjectId = signal<string | null>(null);
  readonly isEditingTitle = signal(false);
  readonly isSavingTitle = signal(false);
  readonly titleError = signal('');

  readonly titleControl = new FormControl('', {
    nonNullable: true,
  });

  private routeSubscription?: Subscription;

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId') ?? '';
      this.mobileSection.set('tasks');

      this.isEditingTitle.set(false);
      this.titleError.set('');

      if (projectId) {
        void this.loadProject(projectId);
      } else {
        this.project.set(null);
        this.errorMessage.set('');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  async loadProject(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.refreshError.set('');
    this.project.set(null);

    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.newProjectId.set(
          this.route.snapshot.queryParamMap.get('editDetails') === '1' ? projectId : null,
        );
        this.project.set(data);
      }
    } catch (error) {
      console.error('Could not load project:', error);

      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.errorMessage.set('Kunne ikke hente projektet.');
      }
    } finally {
      if (this.route.snapshot.paramMap.get('projectId') === projectId) {
        this.isLoading.set(false);
      }
    }
  }

  onDetailsOpened(): void {
    this.newProjectId.set(null);
    if (this.route.snapshot.queryParamMap.get('editDetails') === '1') {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editDetails: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  async retryRefresh(): Promise<void> {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    try {
      await this.refreshProject();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  async refreshProject(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    this.refreshError.set('');
    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.onAiCompleted(data);
    } catch (error) {
      console.error('Could not refresh project:', error);
      if (this.route.snapshot.paramMap.get('projectId') === projectId)
        this.refreshError.set(
          'Ændringen kan være gemt, men projektet kunne ikke genindlæses. Dine lokale rettelser vises stadig.',
        );
    }
  }

  onAiCompleted(data: ProjectData): void {
    if (this.route.snapshot.paramMap.get('projectId') !== data.project.id) return;
    this.project.set(data);
    this.workspace.updateProject(data.project);
  }

  startEditingTitle(): void {
    const title = this.project()?.project.title ?? '';

    this.titleControl.setValue(title);
    this.titleError.set('');
    this.isEditingTitle.set(true);
  }

  cancelEditingTitle(): void {
    this.isEditingTitle.set(false);
    this.titleError.set('');
  }

  async saveTitle(): Promise<void> {
    const projectId = this.project()?.project.id;
    const title = this.titleControl.value.trim();

    if (!projectId || !title || this.isSavingTitle()) {
      return;
    }

    this.isSavingTitle.set(true);
    this.titleError.set('');

    try {
      await this.projectService.updateProjectTitle(projectId, title);

      this.isEditingTitle.set(false);

      await this.refreshProject();
    } catch (error) {
      console.error('Could not save project title:', error);
      this.titleError.set('Kunne ikke gemme projekttitlen.');
    } finally {
      this.isSavingTitle.set(false);
    }
  }

  async onDetailsSaved(): Promise<void> {
    const projectId = this.project()?.project.id;

    if (!projectId) {
      return;
    }

    try {
      const data = await this.projectService.getProject(projectId);

      if (this.route.snapshot.paramMap.get('projectId') !== projectId) {
        return;
      }

      this.onAiCompleted(data);
    } catch (error) {
      console.error('Could not refresh project details:', error);
      if (this.route.snapshot.paramMap.get('projectId') === projectId)
        this.refreshError.set(
          'Oplysningerne er gemt, men visningen kunne ikke genindlæses. Prøv igen.',
        );
    }
  }

  async onOfferFinalized(): Promise<void> {
    await this.sidebar()?.loadOffers();
  }
}
