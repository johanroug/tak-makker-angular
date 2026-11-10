import { Component, input } from '@angular/core';

@Component({
  selector: 'app-workspace-icon',
  templateUrl: './workspace-icon.component.html',
  styleUrl: './workspace-icon.component.scss',
})
export class WorkspaceIcon {
  readonly name = input('projects');
  readonly paths: Record<string, string> = {
    subscription: 'M3 5h18v14H3ZM3 9h18M7 15h4',
    account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z',
    projects: 'M3 7h7l2 2h9v11H3ZM3 7V4h7l2 3h9v2',
    company: 'M4 21V7h16v14M9 7V3h6v4M8 11h1m6 0h1m-8 4h1m6 0h1M10 21v-3h4v3M2 21h20',
    users:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    chat: 'M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 2-2Z',
    tasks: 'M9 5h12M9 12h12M9 19h12M2 5l2 2 3-4M2 12l2 2 3-4M2 19l2 2 3-4',
    checkCircle: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM7.5 12l3 3 6-6',
    warning: 'M10.3 4.5 2.4 18.3A1.8 1.8 0 0 0 4 21h16a1.8 1.8 0 0 0 1.6-2.7L13.7 4.5a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01',
    chevron: 'm9 5 7 7-7 7',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
    wrench: 'M14 7l3 3 4-4a6 6 0 0 1-7 8l-7.5 7.5a2.1 2.1 0 0 1-3-3L11 11a6 6 0 0 1 7-8Z',
    coins: 'M22 5c0 1.7-3.1 3-7 3S8 6.7 8 5s3.1-3 7-3 7 1.3 7 3Zm0 0v9c0 1.7-3.1 3-7 3m7-8c0 1.7-3.1 3-7 3M8 5v5m6 3c0 1.7-2.7 3-6 3s-6-1.3-6-3 2.7-3 6-3 6 1.3 6 3Zm0 0v6c0 1.7-2.7 3-6 3s-6-1.3-6-3v-6m12 3c0 1.7-2.7 3-6 3s-6-1.3-6-3',
    calculator: 'M5 2h14v20H5ZM8 6h8v4H8Zm1 8h.01m6 0h.01m-6 4h.01m6 0h.01',
    materials: 'm12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7.5 4.5l9 5',
    templateInsert: 'M4 3h10v4h6v14H4ZM14 3v4h6M8 12h8M12 9v6',
    templateSave: 'M4 3h13l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8',
    offers: 'M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h8',
    logout: 'M9 3H3v18h6M13 7l5 5-5 5M7 12h15',
  };
}
