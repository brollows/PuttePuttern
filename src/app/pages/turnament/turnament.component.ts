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
  currentSelectedRow: any = null;
  selectedProfile: any = null;
  selectedIndex: number | null = null;

  isOcrRunning = false;

  showInfoModal = false;
  showCardsModal = false;
  showExampleImage = true;

  randomCards = [];

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
      b.total_birdies - a.total_birdies ||
      a['profile$id'] - b['profile$id']
    );
  }

  async removeRow(row: any) {
    const rowProfile = this.getProfile(row['profile$id']);
    if ((rowProfile == undefined) || (
      row.total_score == 0
      && row.total_birdies == 0
      && row.total_bogeys == 0
      && row.total_par == 0
    )
    ) {

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
    } else {
      alert("Du må slette brukeren eller nulle ut scoren før du kan slette")
      return;
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
    this.currentSelectedRow = {
      total_birdies: 0,
      total_bogeys: 0,
      total_par: 0,
      total_score: 0
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
    if (
      this.currentSelectedRow &&
      ['total_score', 'total_birdies', 'total_par', 'total_bogeys'].includes(field)
    ) {
      this.currentSelectedRow[field] += delta;
    }
  }

  async saveEdits() {
    const updated = {
      total_score: this.selectedRow.total_score + this.currentSelectedRow.total_score,
      total_birdies: this.selectedRow.total_birdies + this.currentSelectedRow.total_birdies,
      total_par: this.selectedRow.total_par + this.currentSelectedRow.total_par,
      total_bogeys: this.selectedRow.total_bogeys + this.currentSelectedRow.total_bogeys
    };

    const { error } = await this.supabase
      .from('turnament')
      .update(updated)
      .eq('id', this.selectedRow.id);

    if (!error) {
      const index = this.rows.findIndex(r => r.id === this.selectedRow.id);
      if (index !== -1) {
        this.rows[index] = { ...this.selectedRow, ...updated };
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
      const reader = new FileReader();
      reader.readAsDataURL(file);

      const parsed: ParsedScore | null = await runOCR(file);
      console.log('📊 Parsed:', parsed);

      if (parsed && this.selectedRow) {
        const profileName = this.selectedProfile?.udiscnavn?.trim().toLowerCase();
        const parsedName = parsed?.navn?.trim().toLowerCase();

        const profileNameExists = !!profileName;
        const parsedNameExists = !!parsedName;

        if (parsedNameExists && profileNameExists && parsedName.includes(profileName)) {
          this.currentSelectedRow.total_score = parsed.total ?? 0;
          this.currentSelectedRow.total_birdies = parsed.birdies;
          this.currentSelectedRow.total_par = parsed.pars;
          this.currentSelectedRow.total_bogeys = parsed.bogeys;
        } else {
          if (!profileNameExists) {
            window.alert(`Denne profilen har ikke linket UDisc-navnet sitt med profilen.`);
          } else if (!parsedNameExists) {
            window.alert(`Kunne ikke lese navnet til brukeren på scoreboardet.`);
          } else {
            window.alert(`Du prøvde å sette score til ${this.selectedProfile.udiscnavn}, med scorekortet til ${parsed.navn}.`);
          }
        }
      }

    } catch (e) {
      alert("OCR feilet. Sjekk bilde og prøv igjen.");
      console.log(e);
    } finally {
      this.isOcrRunning = false;
    }
  }

  generateRandomCards() {
    if (this.randomCards.length < 1) {

      let amount = this.rows.length;

      let moduloPlayers = amount % 4
      let amountOfCards = Math.floor(amount / 4)
      if (moduloPlayers >= 2) {
        amountOfCards += 1
      }
      console.log("Players: " + amount + "| amountOfCards: " + amountOfCards)

      let tempRows = this.rows.slice();
      let newRandomCards: any = [];


      for (let i = 0; i < amountOfCards; i++) {
        newRandomCards.push([]);
      }


      let currentIndex = 0;
      while (tempRows.length > 0) {

        let randomIndex = Math.floor(Math.random() * tempRows.length);
        let picked = tempRows.splice(randomIndex, 1)[0];


        newRandomCards[currentIndex].push(picked);


        currentIndex = (currentIndex + 1) % amountOfCards;
      }

      this.randomCards = newRandomCards;
    }
    console.log(this.randomCards)
  }

  openInfoModal() {
    this.showInfoModal = true;
  }

  closeInfoModal() {
    this.showInfoModal = false;
  }

  openCardsModal() {
    this.showCardsModal = true;
    this.generateRandomCards();
  }

  closeCardsModal() {
    this.showCardsModal = false;
    this.randomCards = [];
  }
}
