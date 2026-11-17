import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiFeedback } from '../../shared/components/ai-feedback/ai-feedback.component';
import {
  OfferPreview,
  type ProjectData,
} from '../../shared/components/offer-preview/offer-preview.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { WorkspaceIcon } from '../../shared/components/workspace-icon.component';
import { DEMO_EXAMPLES } from './demo-examples';

const SECTIONS = [
  { id: 'chat', label: 'Samtale', title: 'Samtale', icon: 'chat' },
  { id: 'tasks', label: 'Opgaver', title: 'Arbejdsopgaver', icon: 'wrench' },
  { id: 'materials', label: 'Materialer', title: 'Materialer', icon: 'materials' },
  { id: 'offer', label: 'Tilbud', title: 'Tilbud', icon: 'offers' },
] as const;

type Section = (typeof SECTIONS)[number]['id'];
type Review = 'accepted' | 'rejected';
type Example = (typeof DEMO_EXAMPLES)[number];

const EMPTY_PROJECT: ProjectData['project'] = {
  id: 'demo',
  project_number: 'Demo',
  company_id: 'demo',
  created_at: '',
  updated_at: null,
  customer_id: null,
  customer_name: null,
  customer_name_source: null,
  customer_address: null,
  customer_address_source: null,
  pending_customer_email: null,
  pending_customer_phone: null,
  title: null,
  title_source: null,
  description: null,
  description_source: null,
  offer_description: null,
  offer_description_source: null,
  work_address: null,
  work_address_source: null,
  hourly_rate: null,
  validity_days: null,
  payment_terms: null,
  reservations: null,
};

@Component({
  selector: 'app-ai-demo',
  imports: [RouterLink, PublicBrandComponent, WorkspaceIcon, OfferPreview, AiFeedback],
  templateUrl: './ai-demo.component.html',
  styleUrls: [
    '../project-detail/project-detail.component.scss',
    '../../shared/components/project-sidebar/project-sidebar.component.scss',
    './ai-demo.component.scss',
  ],
})
export class AiDemo {
  protected readonly examples = DEMO_EXAMPLES;
  protected readonly sections = SECTIONS;
  protected readonly section = signal<Section>('chat');
  protected readonly mobileTitle = computed(
    () => this.sections.find((section) => section.id === this.section())?.title,
  );
  protected readonly selected = signal<Example | null>(DEMO_EXAMPLES[0] ?? null);
  protected readonly offerSearch = signal('');
  protected readonly matchingOffers = computed(() => {
    const terms = this.offerSearch().toLocaleLowerCase('da-DK').trim().split(/\s+/);
    return this.examples.filter(({ trade, title }) => {
      const label = (trade + ' ' + title).toLocaleLowerCase('da-DK');
      return terms.every((term) => label.includes(term));
    });
  });
  protected readonly stage = signal(0);
  private readonly finalStage = 5;
  protected readonly complete = computed(() => this.stage() === this.finalStage);
  private readonly reviews = signal<Record<string, Review>>({});

  protected readonly draft = computed<ProjectData>(() => {
    const example = this.selected();
    const stage = this.stage();
    const reviews = this.reviews();
    const project = {
      ...EMPTY_PROJECT,
      title: stage ? (example?.title ?? null) : null,
      description: stage ? (example?.description ?? null) : null,
      hourly_rate: stage >= 4 ? (example?.hourlyRate ?? null) : null,
    };
    const line = (id: string) => ({
      id,
      project_id: project.id,
      created_at: '',
      updated_at: null,
      status: reviews[id] ?? 'accepted',
    });

    return {
      project,
      company: { name: null, cvr: null, address: null, phone: null, email: null },
      customer: null,
      messages: [],
      workItems:
        stage >= 2 && example
          ? example.jobs.map((job, index) => ({
              ...line('work-' + index),
              trade: example.trade,
              description: job.name ? `${job.name}. ${job.description}` : job.description,
              estimated_hours: stage >= 4 ? job.hours : null,
              estimated_hours_source: null,
              estimate_basis: null,
            }))
          : [],
      materials:
        stage >= 3 && example
          ? example.materials.map((material, index) => ({
              ...line('material-' + index),
              name: material.name,
              quantity: material.quantity,
              unit: material.unit,
              unit_price: material.unitPrice,
              category: material.category ?? null,
              quantity_source: null,
              unit_source: null,
            }))
          : [],
    };
  });

  protected readonly lineCounts = computed(() => {
    const lines = this.section() === 'tasks' ? this.draft().workItems : this.draft().materials;
    return {
      accepted: lines.filter((item) => item.status === 'accepted').length,
      total: lines.length,
    };
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly composer = viewChild<ElementRef<HTMLElement>>('composer');
  private readonly offerPicker = viewChild<ElementRef<HTMLDetailsElement>>('offerPicker');
  private readonly offerSearchInput = viewChild<ElementRef<HTMLInputElement>>('offerSearchInput');
  private readonly skipButton = viewChild<ElementRef<HTMLButtonElement>>('skipButton');
  private readonly reviewButton = viewChild<ElementRef<HTMLButtonElement>>('reviewButton');
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected start(): void {
    if (!this.selected() || this.stage()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finish(true);
      return;
    }

    this.stage.set(1);
    this.focusAfterRender(() => this.skipButton()?.nativeElement);
    this.timer = setInterval(() => {
      if (this.stage() === this.finalStage - 1) {
        const skip = this.skipButton()?.nativeElement;
        this.finish(!!skip && skip.ownerDocument.activeElement === skip);
      } else {
        this.stage.update((stage) => stage + 1);
      }
    }, 1350);
  }

  protected finish(moveFocus: boolean): void {
    clearInterval(this.timer);
    this.stage.set(this.finalStage);
    if (moveFocus) this.focusAfterRender(() => this.reviewButton()?.nativeElement);
  }

  protected review(id: string, status: Review): void {
    if (this.complete()) this.reviews.update((reviews) => ({ ...reviews, [id]: status }));
  }

  protected showOffer(): void {
    this.section.set('offer');
    this.focusAfterRender(() => this.host.nativeElement.querySelector('.quotation-summary'));
  }

  protected showLines(section: 'tasks' | 'materials'): void {
    this.section.set(section);
    this.focusAfterRender(() =>
      this.host.nativeElement.querySelector(`[data-draft-section="${section}"]`),
    );
  }

  protected reset(): void {
    this.loadExample(DEMO_EXAMPLES[0] ?? null);
    this.focusAfterRender(() => this.composer()?.nativeElement);
  }

  protected selectOffer(example: Example): void {
    if (example !== this.selected() || !this.complete()) {
      this.loadExample(example);
      this.finish(false);
    }
    this.section.set('tasks');
    this.closeOfferPicker(true);
  }

  protected onOfferPickerToggle(): void {
    if (this.offerPicker()?.nativeElement.open) {
      this.offerSearch.set('');
      this.offerSearchInput()?.nativeElement.focus();
    }
  }

  protected closeOfferPicker(restoreFocus = false): void {
    const picker = this.offerPicker()?.nativeElement;
    if (!picker?.open) return;
    picker.open = false;
    if (restoreFocus) picker.querySelector('summary')?.focus();
  }

  protected focusFirstOffer(): void {
    this.offerPicker()?.nativeElement.querySelector<HTMLButtonElement>('.project-result')?.focus();
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:focusin', ['$event'])
  protected onOfferPickerOutside(event: Event): void {
    if (!this.offerPicker()?.nativeElement.contains(event.target as Node | null)) {
      this.closeOfferPicker();
    }
  }

  private loadExample(example: Example | null): void {
    clearInterval(this.timer);
    this.selected.set(example);
    this.reviews.set({});
    this.stage.set(0);
    this.section.set('chat');
  }

  private focusAfterRender(target: () => HTMLElement | null | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }
}
