import { Component, ElementRef, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { WorkspaceIcon } from '../workspace-icon.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/projects/project.service';
import { TaskTemplate, TaskTemplateService } from '../../../core/projects/task-template.service';
type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;

@Component({
  selector: 'app-project-tools', imports: [ReactiveFormsModule, WorkspaceIcon],
  templateUrl: './project-tools.component.html', styleUrl: './project-tools.component.scss',
})
export class ProjectTools {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menu = viewChild.required<ElementRef<HTMLDetailsElement>>('toolsMenu');
  private readonly modal = viewChild.required<ElementRef<HTMLDialogElement>>('toolDialog');
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.menu().nativeElement.open = false;
  }
  @HostListener('document:keydown.escape')
  closeMenu(): void { this.menu().nativeElement.open = false; }
  close(): void {
    if (this.busy()) return;
    this.modal().nativeElement.close();
    this.mode.set(null);
    this.menu().nativeElement.querySelector('summary')?.focus();
  }
  readonly data = input.required<ProjectData>();
  readonly disabled = input(false);
  readonly changed = output<void>();
  private readonly projects = inject(ProjectService);
  private readonly service = inject(TaskTemplateService);
  readonly mode = signal<'work' | 'material' | 'save' | 'apply' | null>(null);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly templates = signal<TaskTemplate[]>([]);
  readonly workIds = signal<string[]>([]);
  readonly materialIds = signal<string[]>([]);
  readonly templateId = new FormControl('', { nonNullable: true });
  readonly name = new FormControl('', { nonNullable: true });
  readonly line = new FormGroup({
    description: new FormControl('', { nonNullable: true }), trade: new FormControl('', { nonNullable: true }),
    hours: new FormControl<number | null>(null), name: new FormControl('', { nonNullable: true }),
    quantity: new FormControl<number | null>(1), unit: new FormControl('stk.', { nonNullable: true }),
    unitPrice: new FormControl<number | null>(null),
  });
  private requestId = crypto.randomUUID();
  private requestTemplateId = '';
  private requestProjectId = '';
  open(mode: 'work' | 'material' | 'save' | 'apply'): void {
    if (this.busy() || this.disabled()) return;
    this.mode.set(mode); this.error.set(''); this.notice.set('');
    this.requestId = crypto.randomUUID(); this.requestTemplateId = ''; this.requestProjectId = this.data().project.id;
    this.name.reset(); this.line.reset(); this.templateId.reset();
    this.workIds.set(this.data().workItems.filter(row => row.status === 'accepted').map(row => row.id));
    this.materialIds.set(this.data().materials.filter(row => row.status === 'accepted').map(row => row.id));
    this.menu().nativeElement.open = false;
    this.modal().nativeElement.showModal();
    if (mode === 'apply') void this.load();
  }
  toggle(kind: 'work' | 'material', id: string): void {
    const selected = kind === 'work' ? this.workIds : this.materialIds;
    selected.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
    this.requestId = crypto.randomUUID();
  }
  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { this.templates.set(await this.service.list()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Skabelonerne kunne ikke hentes.'); }
    finally { this.loading.set(false); }
  }
  async submit(): Promise<void> {
    if (this.busy() || this.disabled() || this.loading() || !this.mode()) return;
    const projectId = this.data().project.id;
    if (projectId !== this.requestProjectId) { this.close(); return; }
    this.busy.set(true); this.error.set('');
    try {
      const mode = this.mode();
      if (mode === 'save') {
        if (!this.name.value.trim() || !this.workIds().length && !this.materialIds().length) throw new Error('Angiv et navn, og vælg mindst én linje.');
        await this.service.save(projectId, this.name.value.trim(), this.workIds(), this.materialIds(), this.requestId);
        this.notice.set('Skabelonen er gemt og kan bruges af hele virksomheden.');
      } else if (mode === 'apply') {
        if (!this.templateId.value) throw new Error('Vælg en skabelon.');
        if (this.requestTemplateId && this.requestTemplateId !== this.templateId.value) this.requestId = crypto.randomUUID();
        this.requestTemplateId = this.templateId.value;
        await this.service.apply(projectId, this.templateId.value, this.requestId);
        this.notice.set('Skabelonen er indsat. Gennemgå og godkend linjerne.');
        this.changed.emit();
      } else if (mode === 'work' || mode === 'material') {
        await this.projects.addManualLine(projectId, mode, { ...this.line.getRawValue(), id: this.requestId });
        this.notice.set('Linjen er tilføjet. Gennemgå og godkend den i tilbuddet.');
        this.changed.emit();
      }
      this.mode.set(null);
      this.modal().nativeElement.close();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Ændringen kunne ikke gemmes.'); }
    finally { this.busy.set(false); }
  }
  async remove(): Promise<void> {
    if (this.busy() || !this.templateId.value || !confirm('Slet denne skabelon for hele virksomheden? Eksisterende projekter ændres ikke.')) return;
    this.busy.set(true); this.error.set('');
    try { await this.service.remove(this.templateId.value); this.templateId.reset(); await this.load(); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Skabelonen kunne ikke slettes.'); }
    finally { this.busy.set(false); }
  }
}
