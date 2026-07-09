import { Component } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';
import { UiFeedbackService } from './services/ui-feedback.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  menuOpen: boolean = false;

  get showAppNavigation(): boolean {
    return this.router.url !== '/login';
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  constructor(
    public router: Router,
    public uiFeedback: UiFeedbackService,
    private swUpdate: SwUpdate,
  ) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          // Automatisk oppdatering ved ny versjon
          this.swUpdate.activateUpdate().then(() => {
            document.location.reload();
          });
        }
      });
    }
  }
}
