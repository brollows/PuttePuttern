import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getSupabaseClient } from '../../../supabase-client';

interface GalleryImage {
  id: number;
  created: string;
  image: string;
  profile$id: number;
  imageUrl?: string;
}

@Component({
  selector: 'app-images',
  imports: [CommonModule],
  templateUrl: './images.component.html',
  styleUrl: './images.component.css',
})
export class ImagesComponent implements OnInit {
  supabase = getSupabaseClient();

  private readonly STORAGE_KEY = 'putteputtern_logged_in_user';
  private readonly MAX_IMAGES_PER_PROFILE = 40;
  private readonly MAX_IMAGE_SIZE_MB = 2;
  private readonly MAX_IMAGE_SIZE_BYTES = this.MAX_IMAGE_SIZE_MB * 1024 * 1024;

  selectedFile: File | null = null;
  uploadMessage = '';
  uploading = false;
  loadingImages = false;
  showUploadModal = false;
  selectedImagePreviewUrl: string | null = null;
  selectedImage: GalleryImage | null = null;

  images: GalleryImage[] = [];
  profiles: any[] = [];

  ngOnInit() {
    this.loadProfiles();
    this.fetchImages();
  }

  get loggedInUser(): any {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get isAdmin(): boolean {
    return this.loggedInUser?.role === 'admin';
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.uploadMessage = '';
  }

  closeUploadModal() {
    if (this.uploading) return;

    this.showUploadModal = false;
    this.selectedFile = null;
    this.uploadMessage = '';
    this.clearSelectedImagePreview();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      this.clearSelectedImagePreview();
      return;
    }

    this.selectedFile = input.files[0];
    this.uploadMessage = '';

    this.clearSelectedImagePreview();
    this.selectedImagePreviewUrl = URL.createObjectURL(this.selectedFile);
  }

  clearSelectedImagePreview() {
    if (this.selectedImagePreviewUrl) {
      URL.revokeObjectURL(this.selectedImagePreviewUrl);
      this.selectedImagePreviewUrl = null;
    }
  }

  async loadProfiles() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    this.profiles = data || [];
    console.log(`Loaded ${this.profiles.length} profiles`);
  }

  async uploadImage() {
    if (!this.selectedFile) {
      this.uploadMessage = 'Velg et bilde først.';
      return;
    }

    const profileId = this.loggedInUser.id;

    const existingImagesForProfile = this.images.filter(
      (image) => image.profile$id === profileId,
    );

    if (existingImagesForProfile.length >= this.MAX_IMAGES_PER_PROFILE) {
      this.uploadMessage = `Du kan maks laste opp ${this.MAX_IMAGES_PER_PROFILE} bilder.`;
      return;
    }

    if (this.selectedFile.size > this.MAX_IMAGE_SIZE_BYTES) {
      this.uploadMessage = `Bildet kan maks være ${this.MAX_IMAGE_SIZE_MB} MB.`;
      return;
    }

    this.uploading = true;
    this.uploadMessage = '';

    try {
      const file = this.selectedFile;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const imagePath = `profile-${profileId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('gallery-images')
        .upload(imagePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await this.supabase
        .from('gallery_images')
        .insert({
          image: imagePath,
          profile$id: profileId,
        });

      if (insertError) {
        throw insertError;
      }

      this.uploadMessage = 'Bildet ble lastet opp!';
      this.selectedFile = null;
      this.clearSelectedImagePreview();

      await this.fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      this.uploadMessage = 'Noe gikk galt ved opplasting.';
    } finally {
      this.uploading = false;
    }
  }

  async fetchImages() {
    this.loadingImages = true;

    try {
      const { data, error } = await this.supabase
        .from('gallery_images')
        .select('id, created, image, profile$id')
        .order('created', { ascending: false });

      if (error) {
        throw error;
      }

      this.images = (data ?? []).map((image: any) => ({
        id: image.id,
        created: image.created,
        image: image.image,
        profile$id: image['profile$id'],
        imageUrl: this.getGalleryImageUrl(image.image),
      }));
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      this.loadingImages = false;
    }
  }

  getGalleryImageUrl(imagePath: string): string {
    return this.supabase.storage.from('gallery-images').getPublicUrl(imagePath)
      .data.publicUrl;
  }

  getProfileById(profileId: number): any | undefined {
    return this.profiles.find((profile) => profile.id === profileId);
  }

  openImageModal(image: GalleryImage) {
    this.selectedImage = image;
  }

  closeImageModal() {
    this.selectedImage = null;
  }

  showPreviousImage(event?: Event) {
    event?.stopPropagation();

    if (!this.selectedImage || this.images.length === 0) return;

    const currentIndex = this.images.indexOf(this.selectedImage);
    const previousIndex =
      currentIndex <= 0 ? this.images.length - 1 : currentIndex - 1;

    this.selectedImage = this.images[previousIndex];
  }

  showNextImage(event?: Event) {
    event?.stopPropagation();

    if (!this.selectedImage || this.images.length === 0) return;

    const currentIndex = this.images.indexOf(this.selectedImage);
    const nextIndex =
      currentIndex >= this.images.length - 1 ? 0 : currentIndex + 1;

    this.selectedImage = this.images[nextIndex];
  }

  getProfileFullName(profileId: number): string {
    const profile = this.getProfileById(profileId);

    if (!profile) {
      return `Profil ${profileId}`;
    }

    return `${profile.fornavn || ''} ${profile.etternavn || ''}`.trim();
  }

  formatCreatedDate(created: string): string {
    return new Date(created).toLocaleString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getImageDownloadName(image: GalleryImage): string {
    const fileName = image.image.split('/').pop() || 'putteputtern-bilde';
    return fileName;
  }

  async deleteImage(image: GalleryImage, event?: Event) {
    event?.stopPropagation();

    if (!this.isAdmin) return;

    const confirmed = confirm('Er du sikker på at du vil slette dette bildet?');

    if (!confirmed) return;

    try {
      const { error: storageError } = await this.supabase.storage
        .from('gallery-images')
        .remove([image.image]);

      if (storageError) {
        console.warn('Error deleting image from storage:', storageError);
      }

      const { error: databaseError } = await this.supabase
        .from('gallery_images')
        .delete()
        .eq('id', image.id);

      if (databaseError) {
        throw databaseError;
      }

      this.images = this.images.filter(
        (galleryImage) => galleryImage.id !== image.id,
      );

      if (this.selectedImage?.id === image.id) {
        this.selectedImage = null;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Kunne ikke slette bildet.');
    }
  }
}
