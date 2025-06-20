import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.css']
})
export class ProfilesComponent {
  showModal = false;

  profiles: any[] = [];

  removeIndex: number | null = null;

  newProfile = {
    fornavn: '',
    etternavn: '',
    rangering: '',
    personalBest: '',
    sitat: '',
    bilde: ''
  };

  openModal() {
    this.showModal = true;
    this.newProfile = { fornavn: '', etternavn: '', rangering: '', personalBest: '', sitat: '', bilde: '' };
  }

  closeModal() {
    this.showModal = false;
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.newProfile.bilde = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  addProfile(event: Event) {
    event.preventDefault();

    // Capitalize fornavn og etternavn
    const capitalize = (text: string) =>
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    const formattedProfile = {
      ...this.newProfile,
      fornavn: capitalize(this.newProfile.fornavn),
      etternavn: capitalize(this.newProfile.etternavn)
    };

    this.profiles.push(formattedProfile);
    this.closeModal();
  }

  confirmRemove(index: number) {
    this.removeIndex = index;
  }

  removeProfile() {
    if (this.removeIndex !== null) {
      this.profiles.splice(this.removeIndex, 1);
      this.removeIndex = null;
    }
  }
}
