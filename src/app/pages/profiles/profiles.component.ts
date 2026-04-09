import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getSupabaseClient } from '../../../supabase-client';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.css'],
})
export class ProfilesComponent implements OnInit {
  supabase = getSupabaseClient();

  private readonly STORAGE_KEY = 'putteputtern_logged_in_user';

  showModal = false;
  profiles: any[] = [];

  removeProfileId: number | null = null;

  editProfileForm = {
    fornavn: '',
    etternavn: '',
    rangering: '',
    personalbest: '',
    sitat: '',
    bilde: '',
    udiscnavn: '',
  };

  personalbestValid = true;
  editingProfileId: number | null = null;

  pinCodeForDeletion: number = 69420;
  pinCodeInput: number | null = null;
  isPinCodeModalOpen = false;

  isLoading = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadProfiles();
  }

  get loggedInUser(): any | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get isLoggedIn(): boolean {
    return !!this.loggedInUser;
  }

  get isAdmin(): boolean {
    return this.loggedInUser?.role === 'admin';
  }

  get displayedProfiles(): any[] {
    const currentUser = this.loggedInUser;

    const filtered = this.profiles.filter((profile) => {
      if (profile.role === 'user') return true;
      if (currentUser && profile.id === currentUser.id) return true;
      return false;
    });

    if (!currentUser) return filtered;

    return [...filtered].sort((a, b) => {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }

  get editingOwnProfile(): boolean {
    return (
      this.editingProfileId !== null &&
      !!this.loggedInUser &&
      this.loggedInUser.id === this.editingProfileId
    );
  }

  closeModal() {
    this.editingProfileId = null;
    this.showModal = false;
    this.editProfileForm = {
      fornavn: '',
      etternavn: '',
      rangering: '',
      personalbest: '',
      sitat: '',
      bilde: '',
      udiscnavn: '',
    };
    this.personalbestValid = true;
  }

  isOwnProfile(profile: any): boolean {
    return !!this.loggedInUser && this.loggedInUser.id === profile.id;
  }

  canEditProfile(profile: any): boolean {
    return this.isAdmin || this.isOwnProfile(profile);
  }

  canRemoveProfile(profile: any): boolean {
    return this.isAdmin || this.isOwnProfile(profile);
  }

  isHighlightedProfile(profile: any): boolean {
    return this.isOwnProfile(profile);
  }

  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      alert('Kun JPG, JPEG, PNG og GIF er tillatt.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.editProfileForm.bilde = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async uploadImage(file: File, filename: string): Promise<string | null> {
    const { error } = await this.supabase.storage
      .from('profile-images')
      .upload(filename, file, { upsert: true });

    if (error) {
      console.error('Feil ved bildeopplasting:', error);
      return null;
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('profile-images')
      .getPublicUrl(filename);

    return publicUrlData?.publicUrl ?? null;
  }

  async removeProfile() {
    if (this.removeProfileId === null) return;

    const profile = this.profiles.find((p) => p.id === this.removeProfileId);

    if (!profile?.id) {
      console.warn('❌ Kan ikke slette uten ID');
      this.removeProfileId = null;
      return;
    }

    if (!this.canRemoveProfile(profile)) {
      alert('Du har ikke tilgang til å slette denne brukeren.');
      this.removeProfileId = null;
      return;
    }

    if (profile.bilde) {
      try {
        const urlParts = profile.bilde.split('/');
        const filename = urlParts[urlParts.length - 1];

        const { error: deleteError } = await this.supabase.storage
          .from('profile-images')
          .remove([filename]);

        if (deleteError) {
          console.warn(
            '⚠️ Klarte ikke slette bildet fra storage:',
            deleteError,
          );
        } else {
          console.log(`🧹 Bildet ${filename} ble slettet fra storage`);
        }
      } catch (e) {
        console.warn('⚠️ Feil ved bilde-sletting:', e);
      }
    }

    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (error) {
      console.error('❌ Feil ved sletting fra database:', error);
      alert('Kunne ikke slette brukeren fra databasen.');
      this.removeProfileId = null;
      return;
    }

    this.profiles = this.profiles.filter((p) => p.id !== profile.id);

    if (this.loggedInUser?.id === profile.id) {
      localStorage.removeItem(this.STORAGE_KEY);
      this.router.navigate(['/login']);
    }

    this.removeProfileId = null;
    this.clearValues();

    console.log(`✅ Bruker med ID ${profile.id} slettet`);
  }

  enterPinCode() {
    this.isPinCodeModalOpen = true;
  }

  checkPinCode(inputPin: number | null) {
    if (inputPin == this.pinCodeForDeletion) {
      this.removeProfile();
    } else {
      alert('Feil pin. Kontakt admin for å slette brukeren!');
      this.clearValues();
    }
  }

  clearValues() {
    this.pinCodeInput = null;
    this.removeProfileId = null;
  }

  confirmRemove(profile: any) {
    if (!this.canRemoveProfile(profile)) {
      alert('Du har ikke tilgang til å slette denne brukeren.');
      return;
    }

    this.removeProfileId = profile.id;
  }

  async loadProfiles() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Klarte ikke hente profiler:', error);
    } else {
      this.profiles = data || [];
      console.log(`📥 Lastet inn ${this.profiles.length} profiler`);
    }
  }

  validatePersonalbest() {
    const value = this.editProfileForm.personalbest;
    this.personalbestValid = /^-?\d+(\.\d+)?$/.test(value.trim());
  }

  editProfile(profile: any) {
    if (!this.canEditProfile(profile)) {
      alert('Du har ikke tilgang til å redigere denne brukeren.');
      return;
    }

    this.editProfileForm = {
      fornavn: profile.fornavn || '',
      etternavn: profile.etternavn || '',
      rangering: profile.rangering?.toString() || '',
      personalbest: profile.personalbest?.toString() || '',
      sitat: profile.sitat || '',
      bilde: profile.bilde || '',
      udiscnavn: profile.udiscnavn || '',
    };

    this.editingProfileId = profile.id;
    this.showModal = true;
    this.personalbestValid = true;
  }

  async saveEditedProfile(event: Event) {
    event.preventDefault();
    this.validatePersonalbest();

    if (!this.personalbestValid) {
      alert('Personlig beste må være et tall');
      return;
    }

    if (this.editingProfileId === null) return;

    const originalProfile = this.profiles.find(
      (p) => p.id === this.editingProfileId,
    );

    if (!originalProfile) return;

    if (!this.canEditProfile(originalProfile)) {
      alert('Du har ikke tilgang til å redigere denne brukeren.');
      return;
    }

    const updatedProfile: any = {
      fornavn: this.editProfileForm.fornavn,
      etternavn: this.editProfileForm.etternavn,
      rangering: parseInt(this.editProfileForm.rangering, 10),
      personalbest: parseInt(this.editProfileForm.personalbest, 10),
      sitat: this.editProfileForm.sitat || '',
      udiscnavn: this.editProfileForm.udiscnavn || '',
    };

    let imageUrl = originalProfile.bilde || '';

    if (this.editProfileForm.bilde?.startsWith('data:image')) {
      const blob = await fetch(this.editProfileForm.bilde).then((res) =>
        res.blob(),
      );
      const fileExt =
        blob.type === 'image/gif'
          ? 'gif'
          : blob.type === 'image/png'
            ? 'png'
            : 'jpg';

      const file = new File(
        [blob],
        `profile-${this.editingProfileId}.${fileExt}`,
        { type: blob.type },
      );

      imageUrl = (await this.uploadImage(file, file.name)) || imageUrl;
    }

    updatedProfile.bilde = imageUrl;

    const { error } = await this.supabase
      .from('profiles')
      .update(updatedProfile)
      .eq('id', this.editingProfileId);

    if (error) {
      console.error('❌ Feil ved oppdatering:', error);
      alert('Kunne ikke oppdatere profilen.');
      return;
    }

    this.profiles = this.profiles.map((profile) =>
      profile.id === this.editingProfileId
        ? { ...profile, ...updatedProfile, bilde: imageUrl }
        : profile,
    );

    if (this.loggedInUser?.id === this.editingProfileId) {
      const updatedLoggedInUser = this.profiles.find(
        (profile) => profile.id === this.editingProfileId,
      );
      if (updatedLoggedInUser) {
        localStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(updatedLoggedInUser),
        );
      }
    }

    this.closeModal();
  }
}
