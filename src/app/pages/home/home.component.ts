import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { getSupabaseClient } from '../../../supabase-client';

interface GalleryImage {
  id: number;
  created: string;
  image: string;
  profile$id: number;
  imageUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  private readonly STORAGE_KEY = 'putteputtern_logged_in_user';

  supabase = getSupabaseClient();

  profiles: any[] = [];
  currentProfile: any = null;
  tournamentRows: any[] = [];
  unitsLeagueRows: any[] = [];
  topTournamentRows: any[] = [];
  topUnitsLeagueRows: any[] = [];
  galleryImages: GalleryImage[] = [];
  randomGalleryImages: GalleryImage[] = [];

  currentTournamentRow: any = null;
  currentUnitsLeagueRow: any = null;

  isLoading = true;
  errorMessage = '';

  async ngOnInit() {
    await this.loadOverview();
  }

  async loadOverview() {
    this.isLoading = true;
    this.errorMessage = '';

    const storedUser = this.getStoredUser();

    try {
      const [
        { data: profiles, error: profilesError },
        { data: turnament, error: turnamentError },
        { data: unitsLeague, error: unitsLeagueError },
        { data: galleryImages, error: galleryImagesError },
      ] = await Promise.all([
        this.supabase.from('profiles').select('*').order('id', {
          ascending: true,
        }),
        this.supabase.from('turnament').select('*'),
        this.supabase.from('units_league').select('*'),
        this.supabase
          .from('gallery_images')
          .select('id, created, image, profile$id')
          .order('created', { ascending: false }),
      ]);

      if (
        profilesError ||
        turnamentError ||
        unitsLeagueError ||
        galleryImagesError
      ) {
        throw (
          profilesError ||
          turnamentError ||
          unitsLeagueError ||
          galleryImagesError
        );
      }

      this.profiles = (profiles || []).filter(
        (profile: any) => profile.role === 'user',
      );

      this.currentProfile =
        this.profiles.find((profile) => profile.id === storedUser?.id) ||
        storedUser;

      const allowedProfileIds = new Set(
        this.profiles.map((profile) => profile.id),
      );

      this.tournamentRows = (turnament || [])
        .filter((row: any) => allowedProfileIds.has(row['profile$id']))
        .sort((a: any, b: any) => this.sortTournamentRows(a, b));

      this.unitsLeagueRows = (unitsLeague || [])
        .filter((row: any) => allowedProfileIds.has(row['profile$id']))
        .sort((a: any, b: any) => this.sortUnitsLeagueRows(a, b));

      this.topTournamentRows = this.tournamentRows.slice(0, 3);
      this.topUnitsLeagueRows = this.unitsLeagueRows.slice(0, 3);

      this.currentTournamentRow =
        this.tournamentRows.find(
          (row) => row['profile$id'] === this.currentProfile?.id,
        ) || null;

      this.currentUnitsLeagueRow =
        this.unitsLeagueRows.find(
          (row) => row['profile$id'] === this.currentProfile?.id,
        ) || null;

      this.galleryImages = (galleryImages || []).map((image: any) => ({
        id: image.id,
        created: image.created,
        image: image.image,
        profile$id: image['profile$id'],
        imageUrl: this.getGalleryImageUrl(image.image),
      }));

      this.randomizeGalleryImages();
    } catch (error) {
      console.error('Kunne ikke laste oversikt:', error);
      this.errorMessage = 'Kunne ikke laste oversikten akkurat naa.';
    } finally {
      this.isLoading = false;
    }
  }

  getStoredUser() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  getProfile(profileId: number) {
    return this.profiles.find((profile) => profile.id === profileId);
  }

  getProfileFirstName(profileId: number) {
    return this.getProfile(profileId)?.fornavn || 'Ukjent';
  }

  randomizeGalleryImages() {
    const shuffledImages = [...this.galleryImages];

    for (let index = shuffledImages.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledImages[index], shuffledImages[randomIndex]] = [
        shuffledImages[randomIndex],
        shuffledImages[index],
      ];
    }

    this.randomGalleryImages = shuffledImages.slice(0, 3);
  }

  getGalleryImageUrl(imagePath: string): string {
    return this.supabase.storage.from('gallery-images').getPublicUrl(imagePath)
      .data.publicUrl;
  }

  getTournamentPlacement(row: any) {
    const score = Number(row?.total_score ?? 0);
    return (
      this.tournamentRows.filter(
        (tournamentRow) => Number(tournamentRow.total_score ?? 0) < score,
      ).length + 1
    );
  }

  getUnitsLeaguePlacement(row: any) {
    const units = Number(row?.total_units ?? 0);
    return (
      this.unitsLeagueRows.filter(
        (unitsLeagueRow) => Number(unitsLeagueRow.total_units ?? 0) > units,
      ).length + 1
    );
  }

  getPlacementLabel(placement: number) {
    switch (placement) {
      case 1:
        return '\u{1F947}';
      case 2:
        return '\u{1F948}';
      case 3:
        return '\u{1F949}';
      default:
        return placement.toString();
    }
  }

  getPlacementClass(placement: number) {
    switch (placement) {
      case 1:
        return 'placement-gold';
      case 2:
        return 'placement-silver';
      case 3:
        return 'placement-bronze';
      default:
        return '';
    }
  }

  private sortTournamentRows(a: any, b: any) {
    return (
      Number(a.total_score ?? 0) - Number(b.total_score ?? 0) ||
      Number(b.total_birdies ?? 0) - Number(a.total_birdies ?? 0) ||
      Number(a['profile$id'] ?? 0) - Number(b['profile$id'] ?? 0)
    );
  }

  private sortUnitsLeagueRows(a: any, b: any) {
    return (
      Number(b.total_units ?? 0) - Number(a.total_units ?? 0) ||
      Number(a['profile$id'] ?? 0) - Number(b['profile$id'] ?? 0)
    );
  }
}
