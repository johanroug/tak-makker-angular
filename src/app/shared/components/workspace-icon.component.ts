import { Component, input } from '@angular/core';

@Component({
  selector: 'app-workspace-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['projects']" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class WorkspaceIcon {
  readonly name = input('projects');
  readonly paths: Record<string, string> = {
    account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z',
    projects: 'M3 7h7l2 2h9v11H3ZM3 7V4h7l2 3h9v2',
    company: 'M4 21V7h16v14M9 7V3h6v4M8 11h1m6 0h1m-8 4h1m6 0h1M10 21v-3h4v3M2 21h20',
    users:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    chat: 'M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 2-2Z',
    tasks: 'M9 5h12M9 12h12M9 19h12M2 5l2 2 3-4M2 12l2 2 3-4M2 19l2 2 3-4',
    materials: 'm12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7.5 4.5l9 5',
    offers: 'M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h8',
    logout: 'M9 3H3v18h6M13 7l5 5-5 5M7 12h15',
  };
}
