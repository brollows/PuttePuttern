import { Component, OnInit } from '@angular/core';
import { getSupabaseClient } from '../../../supabase-client';
import { CommonModule } from '@angular/common';
import { runOCR, ParsedScore } from '../../utils/ocr';



@Component({
  selector: 'app-turnament',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './turnament.component.html',
  styleUrls: ['./turnament.component.css']
})
export class TurnamentComponent implements OnInit {
  supabase = getSupabaseClient();

  profiles: any[] = [];
  rows: any[] = [];

  selectedRow: any = null;
  selectedProfile: any = null;
  selectedIndex: number | null = null;

  isOcrRunning = false;



  readonly editableFields = ['total_score', 'total_birdies', 'total_par', 'total_bogeys'];

  async ngOnInit() {
    await this.loadProfilesAndTurnament();
  }

  async loadProfilesAndTurnament() {
    const [{ data: profiles }, { data: turnament }] = await Promise.all([
      this.supabase.from('profiles').select('*'),
      this.supabase.from('turnament').select('*')
    ]);

    this.profiles = profiles || [];
    this.rows = turnament || [];

    const existingIds = new Set(this.rows.map(row => row['profile$id']));
    const missingProfiles = this.profiles.filter(p => !existingIds.has(p.id));

    for (const profile of missingProfiles) {
      const newRow = {
        'profile$id': profile.id,
        total_score: 0,
        total_birdies: 0,
        total_par: 0,
        total_bogeys: 0
      };

      const { data, error } = await this.supabase
        .from('turnament')
        .insert([newRow])
        .select();

      if (data && data.length) {
        this.rows.push(data[0]);
      } else {
        console.error('Feil ved insert:', error);
      }
    }

    this.sortRows();
  }

  sortRows() {
    this.rows.sort((a, b) =>
      a.total_score - b.total_score ||
      a['profile$id'] - b['profile$id']
    );
  }

  async removeRow(row: any) {
    const { error } = await this.supabase
      .from('turnament')
      .delete()
      .eq('id', row.id);

    if (!error) {
      this.rows = this.rows.filter(r => r.id !== row.id);
      this.closeEditModal()
    } else {
      console.error('Feil ved sletting:', error);
    }
  }

  getProfileName(profileId: number) {
    const profile = this.profiles.find(p => p.id === profileId);
    return profile ? `${profile.fornavn} ${profile.etternavn}` : `Ukjent (${profileId})`;
  }

  getProfile(profileId: number) {
    return this.profiles.find(p => p.id === profileId);
  }

  openEditModal(row: any, index: number) {
    this.selectedRow = { ...row };
    this.selectedIndex = index;
    this.selectedProfile = this.getProfile(row['profile$id']);
  }

  closeEditModal() {
    this.selectedRow = null;
    this.selectedProfile = null;
  }

  adjust(field: string, delta: number) {
    if (
      this.selectedRow &&
      ['total_score', 'total_birdies', 'total_par', 'total_bogeys'].includes(field)
    ) {
      this.selectedRow[field] += delta;
    }
  }

  async saveEdits() {
    const { error } = await this.supabase
      .from('turnament')
      .update({
        total_score: this.selectedRow.total_score,
        total_birdies: this.selectedRow.total_birdies,
        total_par: this.selectedRow.total_par,
        total_bogeys: this.selectedRow.total_bogeys
      })
      .eq('id', this.selectedRow.id);

    if (!error) {
      const index = this.rows.findIndex(r => r.id === this.selectedRow.id);
      if (index !== -1) {
        this.rows[index] = { ...this.selectedRow };
        this.sortRows();
      }
      this.closeEditModal();
    } else {
      console.error('❌ Feil ved oppdatering:', error);
      alert('Kunne ikke lagre endringer.');
    }
  }

  getPlacement(index: number): string | number {
    const current = this.rows[index];
    const currentScore = current.total_score;

    let placement = 1;
    for (let i = 0; i < index; i++) {
      const prevScore = this.rows[i].total_score;
      if (prevScore < currentScore) {
        placement++;
      } else if (prevScore === currentScore) {
        // Hvis samme score finnes tidligere, bruk samme plassering som den forrige
        return this.getPlacement(i);
      }
    }

    switch (placement) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return placement;
    }
  }

  async onOCRImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isOcrRunning = true;


    try {
      // Original forhåndsvisning
      const reader = new FileReader();
      reader.readAsDataURL(file);

      // 🧪 Lag forhåndsvisning av ferdig gråskala bilde (ikke invertert)
      //const processed = await preprocessImage(file);
      //this.ocrProcessedPreviewUrl = processed;

      // 🔍 Kjør OCR og fyll inn feltene
      const parsed: ParsedScore | null = await runOCR(file);
      console.log('📊 Parsed:', parsed);

      if (parsed && this.selectedRow) {
        this.selectedRow.total_score = parsed.total ?? 0;
        this.selectedRow.total_birdies = parsed.birdies;
        this.selectedRow.total_par = parsed.pars;
        this.selectedRow.total_bogeys = parsed.bogeys;
      }

    } catch (e) {
      alert("OCR feilet. Sjekk bilde og prøv igjen.");
    } finally {
      this.isOcrRunning = false;
    }
  }


}
