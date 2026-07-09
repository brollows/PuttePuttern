import { Component, OnInit, inject } from '@angular/core';
import { getSupabaseClient } from '../../../supabase-client';
import { CommonModule } from '@angular/common';
import { UiFeedbackService } from '../../services/ui-feedback.service';

@Component({
  selector: 'app-units-league',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './units-league.component.html',
  styleUrl: './units-league.component.css',
})
export class UnitsLeagueComponent {
  supabase = getSupabaseClient();
  private readonly uiFeedback = inject(UiFeedbackService);

  profiles: any[] = [];
  rows: any[] = [];

  selectedRow: any = null;
  currentSelectedRow: any = null;
  selectedProfile: any = null;
  selectedIndex: number | null = null;

  showInfoModal = false;

  currentUser: any = null;

  readonly editableFields = ['total_units'];

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  async ngOnInit() {
    const storedUser = localStorage.getItem('putteputtern_logged_in_user');
    this.currentUser = storedUser ? JSON.parse(storedUser) : null;

    await this.loadProfilesAndUnitsLeague();
  }

  async loadProfilesAndUnitsLeague() {
    const [{ data: profiles }, { data: unitsLeague }] = await Promise.all([
      this.supabase.from('profiles').select('*'),
      this.supabase.from('units_league').select('*'),
    ]);

    this.profiles = (profiles || []).filter(
      (profile: any) => profile.role === 'user',
    );

    const allowedProfileIds = new Set(
      this.profiles.map((profile) => profile.id),
    );

    this.rows = (unitsLeague || []).filter((row: any) =>
      allowedProfileIds.has(row['profile$id']),
    );

    const existingIds = new Set(this.rows.map((row) => row['profile$id']));
    const missingProfiles = this.profiles.filter(
      (profile) => !existingIds.has(profile.id),
    );

    for (const profile of missingProfiles) {
      const newRow = {
        profile$id: profile.id,
        total_units: 0,
      };

      const { data, error } = await this.supabase
        .from('units_league')
        .insert([newRow])
        .select();

      if (data && data.length) {
        this.rows.push(data[0]);
      } else {
        console.error('Error when inserting:', error);
      }
    }

    this.sortRows();
  }

  sortRows() {
    this.rows.sort((a, b) => {
      if (b.total_units !== a.total_units) {
        return b.total_units - a.total_units;
      }

      return a['profile$id'] - b['profile$id'];
    });
  }

  async removeRow(row: any) {
    if (!this.isAdmin) {
      this.uiFeedback.notify('Bare admin kan slette score-rader.', 'error');
      return;
    }

    const rowProfile = this.getProfile(row['profile$id']);
    if (rowProfile == undefined || row.total_units == 0) {
      const { error } = await this.supabase
        .from('units_league')
        .delete()
        .eq('id', row.id);

      if (!error) {
        this.rows = this.rows.filter((r) => r.id !== row.id);
        this.closeEditModal();
      } else {
        console.error('error when deleting:', error);
      }
    } else {
      this.uiFeedback.notify(
        'Du må slette brukeren eller nulle ut scoren før du kan slette.',
        'error',
      );
      return;
    }
  }

  getProfileName(profileId: number) {
    const profile = this.profiles.find((p) => p.id === profileId);
    return profile
      ? `${profile.fornavn} ${profile.etternavn}`
      : `Ukjent (${profileId})`;
  }

  getProfile(profileId: number) {
    return this.profiles.find((p) => p.id === profileId);
  }

  openEditModal(row: any, index: number) {
    this.selectedRow = { ...row };
    this.currentSelectedRow = {
      total_units: 0,
    };
    this.selectedIndex = index;
    this.selectedProfile = this.getProfile(row['profile$id']);
  }

  closeEditModal() {
    this.selectedRow = null;
    this.currentSelectedRow = null;
    this.selectedProfile = null;
  }

  adjust(field: string, delta: number) {
    if (!this.canEditRow(this.selectedRow)) {
      return;
    }

    if (this.currentSelectedRow && ['total_units'].includes(field)) {
      this.currentSelectedRow[field] += delta;
    }
  }

  async saveEdits() {
    if (!this.canEditRow(this.selectedRow)) {
      this.uiFeedback.notify(
        'Du kan bare lagre enheter på din egen profil.',
        'error',
      );
      return;
    }

    const updated = {
      total_units:
        this.selectedRow.total_units + this.currentSelectedRow.total_units,
    };

    const { error } = await this.supabase
      .from('units_league')
      .update(updated)
      .eq('id', this.selectedRow.id);

    if (!error) {
      const index = this.rows.findIndex((r) => r.id === this.selectedRow.id);
      if (index !== -1) {
        this.rows[index] = { ...this.selectedRow, ...updated };
        this.sortRows();
      }
      this.closeEditModal();
    } else {
      console.error('Error updating:', error);
      this.uiFeedback.notify('Kunne ikke lagre endringer.', 'error');
    }
  }

  getPlacement(index: number): string | number {
    const current = this.rows[index];
    const currentUnits = current.total_units;

    let placement = 1;

    for (let i = 0; i < index; i++) {
      const prevUnits = this.rows[i].total_units;

      if (prevUnits > currentUnits) {
        placement++;
      } else if (prevUnits === currentUnits) {
        return this.getPlacement(i);
      }
    }

    switch (placement) {
      case 1:
        return '🤢';
      case 2:
        return '😵‍💫';
      case 3:
        return '🥴';
      default:
        return placement;
    }
  }

  openInfoModal() {
    this.showInfoModal = true;
  }

  closeInfoModal() {
    this.showInfoModal = false;
  }

  canEditRow(row: any): boolean {
    if (!this.currentUser || !row) return false;

    return (
      this.currentUser.role === 'admin' ||
      row['profile$id'] === this.currentUser.id
    );
  }
}
