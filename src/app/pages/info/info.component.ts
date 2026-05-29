import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../services/pwa-install.service';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css'],
})
export class InfoComponent {
  constructor(public pwaInstall: PwaInstallService) {}

  installApp(): void {
    this.pwaInstall.install();
  }
}
