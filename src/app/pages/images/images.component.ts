import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getSupabaseClient } from '../../../supabase-client';
import { UiFeedbackService } from '../../services/ui-feedback.service';

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
export class ImagesComponent implements OnInit, OnDestroy {
  supabase = getSupabaseClient();
  private readonly uiFeedback = inject(UiFeedbackService);

  private readonly STORAGE_KEY = 'putteputtern_logged_in_user';
  private readonly MAX_IMAGES_PER_PROFILE = 40;

  readonly MAX_IMAGE_SIZE_MB = 2;

  private readonly MAX_IMAGE_SIZE_BYTES = this.MAX_IMAGE_SIZE_MB * 1024 * 1024;

  selectedFile: File | null = null;
  uploadMessage = '';
  compressedImageMessage = '';
  uploading = false;
  compressingImage = false;
  imageTooLarge = false;
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

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  get loggedInUser(): any {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get isAdmin(): boolean {
    return this.loggedInUser?.role === 'admin';
  }

  isOwnImage(image: GalleryImage): boolean {
    return this.loggedInUser?.id === image.profile$id;
  }

  canDeleteImage(image: GalleryImage): boolean {
    return this.isAdmin || this.isOwnImage(image);
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.uploadMessage = '';
    this.compressedImageMessage = '';
    this.updateBodyScrollLock();
  }

  closeUploadModal() {
    if (this.uploading || this.compressingImage) return;

    this.showUploadModal = false;
    this.selectedFile = null;
    this.uploadMessage = '';
    this.compressedImageMessage = '';
    this.imageTooLarge = false;
    this.clearSelectedImagePreview();
    this.updateBodyScrollLock();
  }

  updateBodyScrollLock() {
    if (this.showUploadModal || this.selectedImage) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      this.imageTooLarge = false;
      this.uploadMessage = '';
      this.compressedImageMessage = '';
      this.clearSelectedImagePreview();
      return;
    }

    this.selectedFile = input.files[0];
    this.uploadMessage = '';
    this.compressedImageMessage = '';
    this.imageTooLarge = this.selectedFile.size > this.MAX_IMAGE_SIZE_BYTES;

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
      this.imageTooLarge = true;
      this.uploadMessage = `Bildet er for stort. Maks størrelse er ${this.MAX_IMAGE_SIZE_MB} MB. Trykk på komprimer først.`;
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
      this.compressedImageMessage = '';
      this.selectedFile = null;
      this.imageTooLarge = false;
      this.clearSelectedImagePreview();

      await this.fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      this.uploadMessage = 'Noe gikk galt ved opplasting.';
    } finally {
      this.uploading = false;
    }
  }

  async compressSelectedImage() {
    if (!this.selectedFile) return;

    if (this.selectedFile.type === 'image/gif') {
      this.uploadMessage = 'GIF kan ikke komprimeres uten å miste animasjonen.';
      return;
    }

    this.compressingImage = true;
    this.uploadMessage = '';
    this.compressedImageMessage = '';

    try {
      const compressedFile = await this.compressImageToMaxSize(
        this.selectedFile,
        this.MAX_IMAGE_SIZE_BYTES,
      );

      this.selectedFile = compressedFile;
      this.imageTooLarge = compressedFile.size > this.MAX_IMAGE_SIZE_BYTES;

      this.clearSelectedImagePreview();
      this.selectedImagePreviewUrl = URL.createObjectURL(compressedFile);

      if (this.imageTooLarge) {
        this.uploadMessage =
          'Bildet er fortsatt for stort etter komprimering. Prøv et annet bilde.';
        return;
      }

      this.compressedImageMessage =
        'Bildet ble komprimert og er klart for opplasting.';
    } catch (error) {
      console.error('Error compressing image:', error);
      this.uploadMessage = 'Kunne ikke komprimere bildet.';
    } finally {
      this.compressingImage = false;
    }
  }

  compressImageToMaxSize(file: File, maxSizeBytes: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = async () => {
        URL.revokeObjectURL(objectUrl);

        try {
          let width = image.width;
          let height = image.height;
          let quality = 0.85;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            reject(new Error('Could not create canvas context.'));
            return;
          }

          let blob: Blob | null = null;

          for (let attempt = 0; attempt < 12; attempt++) {
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            blob = await new Promise<Blob | null>((blobResolve) =>
              canvas.toBlob(blobResolve, 'image/jpeg', quality),
            );

            if (!blob) {
              reject(new Error('Could not compress image.'));
              return;
            }

            if (blob.size <= maxSizeBytes) {
              const compressedFile = new File(
                [blob],
                this.getCompressedFileName(file.name),
                { type: 'image/jpeg' },
              );

              resolve(compressedFile);
              return;
            }

            if (quality > 0.45) {
              quality -= 0.1;
            } else {
              width *= 0.85;
              height *= 0.85;
            }
          }

          if (!blob) {
            reject(new Error('Could not compress image.'));
            return;
          }

          const compressedFile = new File(
            [blob],
            this.getCompressedFileName(file.name),
            { type: 'image/jpeg' },
          );

          resolve(compressedFile);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not load image.'));
      };

      image.src = objectUrl;
    });
  }

  getCompressedFileName(originalFileName: string): string {
    const nameWithoutExtension = originalFileName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExtension}-compressed.jpg`;
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
    this.updateBodyScrollLock();
  }

  closeImageModal() {
    this.selectedImage = null;
    this.updateBodyScrollLock();
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

    if (!this.canDeleteImage(image)) return;

    const confirmed = await this.uiFeedback.confirm(
      'Er du sikker på at du vil slette dette bildet?',
      {
        title: 'Slett bilde',
        confirmText: 'Slett',
      },
    );

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
        this.updateBodyScrollLock();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      this.uiFeedback.notify('Kunne ikke slette bildet.', 'error');
    }
  }

  async downloadImage(image: GalleryImage, event?: Event) {
    event?.stopPropagation();

    if (!image.imageUrl) return;

    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = this.getImageDownloadName(image);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      this.uiFeedback.notify('Kunne ikke laste ned bildet.', 'error');
    }
  }
}
