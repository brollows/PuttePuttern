import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getSupabaseClient } from '../../../supabase-client';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private supabase = getSupabaseClient();
  private readonly STORAGE_KEY = 'putteputtern_logged_in_user';

  activeView: 'login' | 'create' | null = null;

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  selectedImageFile: File | null = null;
  selectedImageName = '';

  loginForm = {
    username: '',
    password: '',
  };

  newUser = {
    fornavn: '',
    etternavn: '',
    username: '',
    password: '',
    role: 'user',
    rangering: 0,
    personalbest: 0,
    sitat: '',
    bilde: '',
    udiscnavn: '',
  };

  constructor(private router: Router) {}

  showLogin() {
    this.clearMessages();
    this.activeView = 'login';
  }

  showCreate() {
    this.clearMessages();
    this.activeView = 'create';
  }

  goBack() {
    this.clearMessages();
    this.activeView = null;
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetCreateForm() {
    this.newUser = {
      fornavn: '',
      etternavn: '',
      username: '',
      password: '',
      role: 'user',
      rangering: 0,
      personalbest: 0,
      sitat: '',
      bilde: '',
      udiscnavn: '',
    };

    this.selectedImageFile = null;
    this.selectedImageName = '';
  }

  resetLoginForm() {
    this.loginForm = {
      username: '',
      password: '',
    };
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.selectedImageFile = null;
      this.selectedImageName = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Kun JPG, JPEG, PNG og GIF er tillatt.';
      this.selectedImageFile = null;
      this.selectedImageName = '';
      input.value = '';
      return;
    }

    this.selectedImageFile = file;
    this.selectedImageName = file.name;
    this.errorMessage = '';
  }

  async login() {
    this.clearMessages();

    if (!this.loginForm.username.trim() || !this.loginForm.password.trim()) {
      this.errorMessage = 'Fyll ut brukernavn og passord.';
      return;
    }

    this.isSubmitting = true;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('username', this.loginForm.username.trim())
        .eq('password', this.loginForm.password.trim())
        .single();

      if (error || !data) {
        this.errorMessage = 'Feil brukernavn eller passord.';
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      this.resetLoginForm();
      await this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Feil ved login:', error);
      this.errorMessage = error?.message || 'Noe gikk galt ved innlogging.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async createUser() {
    this.clearMessages();

    if (
      !this.newUser.fornavn.trim() ||
      !this.newUser.etternavn.trim() ||
      !this.newUser.username.trim() ||
      !this.newUser.password.trim()
    ) {
      this.errorMessage = 'Fyll ut fornavn, etternavn, brukernavn og passord.';
      return;
    }

    this.isSubmitting = true;

    try {
      const profilePayload = {
        fornavn: this.newUser.fornavn.trim(),
        etternavn: this.newUser.etternavn.trim(),
        username: this.newUser.username.trim(),
        password: this.newUser.password.trim(),
        role: this.newUser.role,
        rangering: Number(this.newUser.rangering) || 0,
        personalbest: Number(this.newUser.personalbest) || 0,
        sitat: this.newUser.sitat.trim(),
        bilde: '',
        udiscnavn: this.newUser.udiscnavn.trim(),
      };

      const { data: createdProfile, error: profileError } = await this.supabase
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      if (this.selectedImageFile) {
        const fileExt =
          this.selectedImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `profile-${createdProfile.id}.${fileExt}`;

        const { error: uploadError } = await this.supabase.storage
          .from('profile-images')
          .upload(fileName, this.selectedImageFile, {
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = this.supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        const { error: updateImageError } = await this.supabase
          .from('profiles')
          .update({ bilde: imageUrl })
          .eq('id', createdProfile.id);

        if (updateImageError) {
          throw updateImageError;
        }
      }

      const { error: turnamentError } = await this.supabase
        .from('turnament')
        .insert({
          profile$id: createdProfile.id,
          total_score: 0,
          total_birdies: 0,
          total_par: 0,
          total_bogeys: 0,
        });

      if (turnamentError) {
        throw turnamentError;
      }

      this.successMessage = `Bruker opprettet: ${createdProfile.fornavn} ${createdProfile.etternavn}`;
      this.resetCreateForm();
      this.activeView = 'login';
    } catch (error: any) {
      console.error('Feil ved opprettelse av bruker:', error);

      if (error?.message?.toLowerCase().includes('duplicate')) {
        this.errorMessage = 'Brukernavnet er allerede i bruk.';
      } else {
        this.errorMessage =
          error?.message || 'Noe gikk galt ved opprettelse av bruker.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
