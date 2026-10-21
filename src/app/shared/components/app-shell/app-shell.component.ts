import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { supabase } from '../../../core/supabase/supabase.client';
import { NewProjectDialog } from '../new-project-dialog/new-project-dialog.component';
import { WorkspaceState } from './workspace-state';

@Component({
  selector: 'app-shell',
  imports: [FormsModule, RouterLink, RouterOutlet, NewProjectDialog],
  providers: [WorkspaceState],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShell implements OnInit {
  readonly workspace = inject(WorkspaceState);
  private readonly router = inject(Router);
  private readonly newProjectDialog = viewChild.required(NewProjectDialog);
  readonly isLoggingOut = signal(false);
  readonly logoutError = signal('');

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.syncSelectedProject();
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
    if (projectId) void this.router.navigate(['/projects', projectId]);
  }

  createProject(): void {
    this.newProjectDialog().open();
  }

  async logout(): Promise<void> {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.logoutError.set('');
    try {
      const { error } = await supabase.auth.signOut();
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
