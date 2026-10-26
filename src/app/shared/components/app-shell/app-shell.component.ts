import { AppAccessService } from '../../../core/auth/app-access.service';
import { interval } from 'rxjs';
import { ActivityService } from '../../../core/activity/activity.service';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationStart,
  NavigationCancel,
  NavigationError,
  NavigationSkipped,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { NewProjectDialog } from '../new-project-dialog/new-project-dialog.component';
import { WorkspaceState } from './workspace-state';
import { PublicBrandComponent } from '../public-brand/public-brand.component';
import { WorkspaceIcon } from '../workspace-icon.component';

@Component({
  selector: 'app-shell',
  host: { '(window:resize)': 'onResize()', '(window:focus)': 'checkCurrentAccess()' },
  imports: [
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NewProjectDialog,
    PublicBrandComponent,
    WorkspaceIcon,
  ],
  providers: [WorkspaceState],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShell implements OnInit {
  readonly activity = inject(ActivityService);
  private readonly access = inject(AppAccessService);
  private accessCheckPending = false;
  async checkCurrentAccess(): Promise<void> {
    if (this.accessCheckPending) return;
    this.accessCheckPending = true;
    try {
      const state = await this.access.state();
      if (state !== 'active') {
        await this.authService.signOut();
        await this.router.navigate(['/login'], {
          queryParams: { access: state === 'pending' ? 'pending' : 'blocked' },
        });
      }
    } catch {
      /* A temporary connection failure is not a confirmed block. */
    } finally {
      this.accessCheckPending = false;
    }
  }
  private lastActivityPath = '';
  private recordPageVisit(): void {
    const path = this.router.url.split(/[?#]/)[0];
    if (path === this.lastActivityPath) return;
    this.lastActivityPath = path;
    const project = /^\/projects\/([0-9a-f-]{36})$/i.exec(path);
    const offer = /^\/offers\/([0-9a-f-]{36})$/i.exec(path);
    if (project)
      this.activity.record('project_opened', true, undefined, undefined, { projectId: project[1] });
    if (offer)
      this.activity.record('offer_opened', true, undefined, undefined, { offerId: offer[1] });
  }
  readonly workspace = inject(WorkspaceState);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly newProjectDialog = viewChild.required(NewProjectDialog);
  readonly isLoggingOut = signal(false);
  readonly logoutError = signal('');
  readonly isMenuOpen = signal(false);
  readonly isNavigating = signal(false);
  private readonly menuDrawer = viewChild.required<ElementRef<HTMLDialogElement>>('menuDrawer');

  openMenu(): void {
    this.isMenuOpen.set(true);
    this.menuDrawer().nativeElement.showModal();
  }

  onResize(): void {
    if (this.isMenuOpen() && window.matchMedia('(min-width: 1168px)').matches) this.closeMenu();
  }
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  closeMenu(restoreFocus = false): void {
    if (!this.isMenuOpen()) return;
    this.isMenuOpen.set(false);
    this.menuDrawer().nativeElement.close();
    if (restoreFocus) this.menuToggle()?.nativeElement.focus();
  }

  constructor() {
    interval(60000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (document.visibilityState === 'visible') void this.checkCurrentAccess();
      });
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(event.url.split(/[?#]/)[0] !== this.router.url.split(/[?#]/)[0]);
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.isNavigating.set(false);
      }
      if (event instanceof NavigationEnd) {
        this.recordPageVisit();
        this.closeMenu();
        this.syncSelectedProject();
      }
    });
  }

  ngOnInit(): void {
    void this.activity.checkAdmin();
    this.recordPageVisit();
    this.syncSelectedProject();
    void this.workspace.loadProjects();
  }

  private syncSelectedProject(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    if (route.routeConfig?.path === ':projectId' || route.routeConfig?.path === '') {
      this.workspace.activeProjectId.set(route.paramMap.get('projectId') ?? '');
    }
  }

  selectProject(projectId: string): void {
    this.closeMenu();
    if (projectId) void this.router.navigate(['/projects', projectId]);
  }

  createProject(): void {
    this.closeMenu();
    this.newProjectDialog().open();
  }

  async logout(): Promise<void> {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.logoutError.set('');
    try {
      const { error } = await this.authService.signOut();
      if (error) throw error;
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Could not sign out:', error);
      this.logoutError.set('Kunne ikke logge ud. Kontrollér forbindelsen og prøv igen.');
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
