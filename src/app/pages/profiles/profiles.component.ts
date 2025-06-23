import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getSupabaseClient } from '../../../supabase-client';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.css']
})
export class ProfilesComponent implements OnInit {
  supabase = getSupabaseClient();
  showModal = false;

  profiles: any[] = [];

  removeIndex: number | null = null;

  newProfile = {
    fornavn: '',
    etternavn: '',
    rangering: '',
    personalbest: '',
    sitat: '',
    bilde: '',
    udiscnavn: ''
  };

  personalbestValid: boolean = true;

  editingIndex: number = -1;

  ngOnInit() {
    this.loadProfiles();
  }

  openModal() {
    this.showModal = true;
    this.newProfile = { fornavn: '', etternavn: '', rangering: '', personalbest: '', sitat: '', bilde: '', udiscnavn: '' };
  }

  closeModal() {
    this.editingIndex = -1;
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

  async addProfile(event: Event) {
    event.preventDefault();
    this.validatePersonalbest();
    if (!this.personalbestValid) {
      alert('Personlig beste må være et tall');
      return;
    }

    const capitalize = (text: string) =>
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    const formattedProfile = {
      ...this.newProfile,
      fornavn: capitalize(this.newProfile.fornavn),
      etternavn: capitalize(this.newProfile.etternavn),
      rangering: parseInt(this.newProfile.rangering, 10),
      personalbest: parseInt(this.newProfile.personalbest, 10),
      sitat: this.newProfile.sitat || '',
      udiscnavn: this.newProfile.udiscnavn || ''
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .insert([formattedProfile])
      .select();

    if (error || !data || data.length === 0) {
      console.error('❌ Feil ved profil-innsetting:', error);
      alert('Kunne ikke lagre profilen 😢');
      return;
    }

    const addedProfile = data[0];
    let imageUrl = '';

    if (this.newProfile.bilde?.startsWith('data:image')) {
      const blob = await fetch(this.newProfile.bilde).then(res => res.blob());
      const file = new File([blob], `profile-${addedProfile.id}.png`, { type: blob.type });
      imageUrl = await this.uploadImage(file, file.name) || '';
    }

    if (imageUrl) {
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({ bilde: imageUrl })
        .eq('id', addedProfile.id);

      if (updateError) {
        console.error('⚠️ Feil ved oppdatering av bilde-URL:', updateError);
      } else {
        addedProfile.bilde = imageUrl;
      }
    }

    this.profiles.push(addedProfile);
    this.closeModal();
  }

  async addProfileToSupabase(profile: any) {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert([{
        fornavn: profile.fornavn,
        etternavn: profile.etternavn,
        rangering: parseInt(profile.rangering, 10),
        personalbest: parseInt(profile.personalbest, 10),
        sitat: profile.sitat || '',
        bilde: profile.bilde || '',
        udiscnavn: profile.udiscnavn || ''
      }])
      .select();

    if (error) {
      console.error('❌ Feil ved innsending:', error);
      alert('Kunne ikke lagre profilen 😢');
    } else if (data && data.length > 0) {
      const added = data[0];
      console.log(`✅ Bruker lagt til: ${added.fornavn} ${added.etternavn} (ID: ${added.id})`);
    } else {
      console.warn('🟡 Ingen data returnert fra Supabase.');
    }
  }

  async uploadImage(file: File, filename: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .storage
      .from('profile-images')
      .upload(filename, file, { upsert: true });

    if (error) {
      console.error('Feil ved bildeopplasting:', error);
      return null;
    }

    const { data: publicUrlData } = this.supabase
      .storage
      .from('profile-images')
      .getPublicUrl(filename);

    return publicUrlData?.publicUrl ?? null;
  }

  async removeProfile() {
    if (this.removeIndex === null) return;

    const profile = this.profiles[this.removeIndex];

    if (!profile?.id) {
      console.warn('❌ Kan ikke slette uten ID');
      this.removeIndex = null;
      return;
    }

    if (profile.bilde) {
      try {
        const urlParts = profile.bilde.split('/');
        const filename = urlParts[urlParts.length - 1];

        const { error: deleteError } = await this.supabase
          .storage
          .from('profile-images')
          .remove([filename]);

        if (deleteError) {
          console.warn('⚠️ Klarte ikke slette bildet fra storage:', deleteError);
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
      this.removeIndex = null;
      return;
    }

    this.profiles.splice(this.removeIndex, 1);
    this.removeIndex = null;

    console.log(`✅ Bruker med ID ${profile.id} slettet`);
  }

  confirmRemove(index: number) {
    this.removeIndex = index;
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
    const value = this.newProfile.personalbest;
    this.personalbestValid = /^-?\d+(\.\d+)?$/.test(value.trim());
  }

  editProfile(index: number) {
    const profile = this.profiles[index];

    this.newProfile = {
      fornavn: profile.fornavn,
      etternavn: profile.etternavn,
      rangering: profile.rangering?.toString() || '',
      personalbest: profile.personalbest?.toString() || '',
      sitat: profile.sitat || '',
      bilde: profile.bilde || '',
      udiscnavn: profile.udiscnavn || ''
    };

    this.editingIndex = index;
    this.showModal = true;
  }

  async saveEditedProfile(event: Event) {
    event.preventDefault();
    this.validatePersonalbest();

    if (!this.personalbestValid) {
      alert('Personlig beste må være et tall');
      return;
    }

    const profileId = this.profiles[this.editingIndex].id;
    const originalProfile = this.profiles[this.editingIndex];
    const updatedProfile: any = {
      fornavn: this.newProfile.fornavn,
      etternavn: this.newProfile.etternavn,
      rangering: parseInt(this.newProfile.rangering, 10),
      personalbest: parseInt(this.newProfile.personalbest, 10),
      sitat: this.newProfile.sitat || '',
      udiscnavn: this.newProfile.udiscnavn || ''
    };

    let imageUrl = originalProfile.bilde;

    if (this.newProfile.bilde?.startsWith('data:image')) {
      const blob = await fetch(this.newProfile.bilde).then(res => res.blob());
      const file = new File([blob], `profile-${profileId}.png`, { type: blob.type });
      imageUrl = await this.uploadImage(file, file.name) || '';
    }

    updatedProfile.bilde = imageUrl;

    const { error } = await this.supabase
      .from('profiles')
      .update(updatedProfile)
      .eq('id', profileId);

    if (error) {
      console.error('❌ Feil ved oppdatering:', error);
      alert('Kunne ikke oppdatere profilen.');
      return;
    }

    this.profiles[this.editingIndex] = {
      ...originalProfile,
      ...updatedProfile,
      bilde: imageUrl
    };

    this.editingIndex = -1;
    this.closeModal();
  }
}
