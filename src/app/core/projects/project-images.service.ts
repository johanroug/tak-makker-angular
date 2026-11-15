import { Injectable, signal } from '@angular/core';

export interface ImageAnalysisInput { ownerId: string; messageId: string; images: { id: string; dataUrl: string }[]; }

export interface LocalProjectImage {
  id: string;
  createdAt: string;
  type: string;
  size: number;
  blob?: Blob;
  messageId?: string;
  analyzed: boolean;
  sentToAi?: boolean;
}
export interface ProjectImages {
  key: string;
  userId: string;
  projectId: string;
  submitted: number;
  quotaVersion: 2;
  images: LocalProjectImage[];
}

// One atomic record keeps local capacity and the lifetime AI quota separate.
@Injectable({ providedIn: 'root' })
export class ProjectImagesService {
  readonly revision = signal(0);
  private database?: Promise<IDBDatabase>;
  private normalize(value: ProjectImages | undefined, userId: string, projectId: string): ProjectImages {
    const record: ProjectImages = value ?? { key: `${userId}:${projectId}`, userId, projectId, submitted: 0, quotaVersion: 2, images: [] };
    if (record.quotaVersion !== 2) {
      // Older uploads only consumed AI quota if they were attached to a message.
      for (const image of record.images) image.sentToAi = !!image.messageId;
      record.submitted = record.images.filter(image => image.sentToAi).length;
      record.quotaVersion = 2;
    }
    return record;
  }
  private open(): Promise<IDBDatabase> {
    return this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('hps-project-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { this.database = undefined; reject(request.error); };
      request.onblocked = () => { this.database = undefined; reject(new Error('Luk andre faner og prøv igen.')); };
    });
  }
  async read(userId: string, projectId: string): Promise<ProjectImages> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('projects').objectStore('projects').get(`${userId}:${projectId}`);
      request.onsuccess = () => resolve(this.normalize(request.result, userId, projectId));
      request.onerror = () => reject(request.error);
    });
  }
  async update(userId: string, projectId: string, change: (record: ProjectImages) => void): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.get(`${userId}:${projectId}`);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const record = this.normalize(request.result, userId, projectId);
          change(record);
          store.put(record);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => { this.revision.update(value => value + 1); resolve(); };
      tx.onabort = tx.onerror = () => reject(failure ?? tx.error);
    });
  }
  async add(userId: string, projectId: string, files: File[]): Promise<void> {
    if (!files.length || files.length > 3) throw new Error('Vælg højst 3 billeder i alt.');
    const images = await Promise.all(files.map(file => this.optimize(file)));
    await this.update(userId, projectId, record => {
      if (record.images.filter(image => image.blob).length + images.length > 3) throw new Error('Projektet kan højst have 3 lokale billeder ad gangen. Slet et billede, før du vælger et nyt.');
      record.images.push(...images);
    });
  }
  async remove(userId: string, projectId: string, id: string): Promise<void> {
    await this.update(userId, projectId, record => {
      const image = record.images.find(image => image.id === id);
      if (image && !image.messageId && !image.sentToAi) record.images = record.images.filter(item => item.id !== id);
      else if (image) { delete image.blob; image.analyzed = true; }
    });
  }
  async reserveAnalysis(userId: string, projectId: string, messageId: string, ids: string[]): Promise<void> {
    await this.update(userId, projectId, record => {
      if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length) throw new Error('Vælg højst 3 billeder til analyse.');
      const images = ids.map(id => record.images.find(image => image.id === id));
      if (images.some(image => !image?.blob || image.messageId !== messageId || image.analyzed)) throw new Error('Billederne er ændret. Kontrollér beskeden og prøv igen.');
      const fresh = images.filter(image => !image!.sentToAi);
      if (record.submitted + fresh.length > 3) throw new Error(`Projektet kan højst sende 3 billeder til AI i alt. Der er ${3 - record.submitted} tilbage. Fjern de nye billeder for at fortsætte uden billedanalyse.`);
      record.submitted += fresh.length;
      for (const image of fresh) image!.sentToAi = true;
    });
  }
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').delete(`${userId}:${projectId}`);
      tx.oncomplete = () => { this.revision.update(value => value + 1); resolve(); };
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  async move(userId: string, draftId: string, projectId: string): Promise<void> {
    if (draftId === projectId) return;
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const source = store.get(`${userId}:${draftId}`);
      source.onsuccess = () => {
        if (!source.result) return;
        const target = store.get(`${userId}:${projectId}`);
        target.onsuccess = () => {
          if (target.result) { tx.abort(); return; }
          store.put({ ...source.result, key: `${userId}:${projectId}`, projectId });
          store.delete(`${userId}:${draftId}`);
        };
      };
      tx.oncomplete = () => { this.revision.update(value => value + 1); resolve(); };
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Billederne kunne ikke knyttes til projektet.'));
    });
  }
  private async optimize(file: File): Promise<LocalProjectImage> {
    if (file.size > 20 * 1024 * 1024) throw new Error('Billedet er for stort. Vælg et billede under 20 MB.');
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) throw new Error('Vælg et foto i JPEG, PNG eller WebP. HEIC kan kun bruges, hvis browseren kan åbne det.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Billedbehandling understøttes ikke i denne browser.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encode = (type: string) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Billedet kunne ikke behandles.')), type, .86));
      let blob = await encode('image/webp');
      if (blob.type !== 'image/webp') blob = await encode('image/jpeg');
      if (blob.size > 1024 * 1024) throw new Error('Det optimerede billede er stadig for stort. Vælg et mindre billede.');
      return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), blob, type: blob.type, size: blob.size, analyzed: false };
    } catch (error) {
      if (error instanceof DOMException) throw new Error('Billedet kunne ikke åbnes. Eksportér eventuelt dit iPhone-foto som JPEG.');
      throw error;
    } finally { URL.revokeObjectURL(url); }
  }
}
