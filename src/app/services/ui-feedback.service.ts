import { Injectable, signal } from '@angular/core';

type FeedbackTone = 'info' | 'success' | 'error';

interface FeedbackMessage {
  id: number;
  text: string;
  tone: FeedbackTone;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (confirmed: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class UiFeedbackService {
  readonly messages = signal<FeedbackMessage[]>([]);
  readonly confirmState = signal<ConfirmRequest | null>(null);

  private nextId = 1;

  notify(text: string, tone: FeedbackTone = 'info'): void {
    const id = this.nextId++;
    this.messages.update((messages) => [...messages, { id, text, tone }]);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(id), 3600);
    }
  }

  dismiss(id: number): void {
    this.messages.update((messages) =>
      messages.filter((message) => message.id !== id),
    );
  }

  confirm(
    message: string,
    options: Partial<Omit<ConfirmRequest, 'message' | 'resolve'>> = {},
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmState.set({
        title: options.title || 'Bekreft',
        message,
        confirmText: options.confirmText || 'Ja',
        cancelText: options.cancelText || 'Avbryt',
        resolve,
      });
    });
  }

  resolveConfirm(confirmed: boolean): void {
    const request = this.confirmState();
    if (!request) return;

    request.resolve(confirmed);
    this.confirmState.set(null);
  }
}
