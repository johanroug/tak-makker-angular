import { Component, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell.component';
import { WorkspaceState } from './workspace-state';
import { PublicBrandComponent } from '../public-brand/public-brand.component';
import { WorkspaceIcon } from '../workspace-icon.component';
import { BillingService } from '../../../core/billing/billing.service';
import { ActivityService } from '../../../core/activity/activity.service';
import { AppAccessService } from '../../../core/auth/app-access.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-new-project-dialog', template: '' })
class DialogStub { readonly projectCreated = output<void>(); }
@Component({ template: '' })
class PageStub {}

describe('Workspace navigation menu', () => {
  const admin = signal(false);
  beforeEach(async () => {
    admin.set(false);
    const workspace = {
      activeProjectId: signal(''), projects: signal([]), error: signal(''), isLoading: signal(false),
      newProjectRequested: new Subject<void>(), loadProjects: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([{ path: 'projects', component: PageStub }, { path: 'company-profile', component: PageStub }]),
        { provide: BillingService, useValue: { load: vi.fn(), endedNotice: signal(false) } },
        { provide: ActivityService, useValue: { isAdmin: admin, checkAdmin: vi.fn(), record: vi.fn() } },
        { provide: AppAccessService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).overrideComponent(AppShell, {
      set: {
        imports: [NgTemplateOutlet, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, DialogStub, PublicBrandComponent, WorkspaceIcon],
        providers: [{ provide: WorkspaceState, useValue: workspace }],
      },
    }).compileComponents();
  });

  it('marks subscription independently from the company profile', async () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/company-profile#subscription');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.side-navigation a.nav-active')?.textContent).toContain('Abonnement');
    expect(host.querySelectorAll('.side-navigation a.nav-active')).toHaveLength(1);
    await router.navigateByUrl('/company-profile');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('.side-navigation a.nav-active')?.textContent).toContain('Virksomhedsprofil');
    expect(host.querySelectorAll('.side-navigation a.nav-active')).toHaveLength(1);
  });

  it('only includes administration for administrators and keeps logout in the footer', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.administration-label')).toBeNull();
    expect(host.querySelector('.drawer-footer .logout-button')).not.toBeNull();
    admin.set(true);
    fixture.detectChanges();
    expect(host.querySelector('.administration-label')).not.toBeNull();
    expect(host.querySelector('a[href="/users"]')).not.toBeNull();
    expect(host.querySelector('a[href="/activity"]')).not.toBeNull();
  });
});
