import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { NewProjectDialog } from '../new-project-dialog/new-project-dialog.component';
import { WorkspaceState } from './workspace-state';

@Component({
  selector: 'app-shell',
  host: { '(window:resize)': 'onResize()' },
  imports: [NgTemplateOutlet, FormsModule, RouterLink, RouterOutlet, NewProjectDialog],
  providers: [WorkspaceState],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShell implements OnInit {
  readonly workspace = inject(WorkspaceState);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly newProjectDialog = viewChild.required(NewProjectDialog);
  readonly isLoggingOut = signal(false);
  readonly logoutError = signal('');
  readonly isMenuOpen = signal(false);
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
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.closeMenu();
        this.syncSelectedProject();
      }
    });
  }

  ngOnInit(): void {
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
