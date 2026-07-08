import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { getSupabaseClient } from '../../../supabase-client';

interface TurnamentCourse {
  id: number;
  name: string;
  created_at?: string;
}

interface TurnamentCourseScore {
  id?: number;
  profile_id: number;
  course_id: number;
  score: number;
}

interface EditableCourseScore {
  courseId: number;
  courseName: string;
  score: number;
}

@Component({
  selector: 'app-turnament',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './turnament.component.html',
  styleUrls: ['./turnament.component.css'],
})
export class TurnamentComponent implements OnInit {
  supabase = getSupabaseClient();

  profiles: any[] = [];
  rows: any[] = [];
  courses: TurnamentCourse[] = [];
  courseScores: TurnamentCourseScore[] = [];

  selectedRow: any = null;
  currentSelectedRow: any = null;
  selectedProfile: any = null;
  selectedIndex: number | null = null;
  selectedCourseScores: EditableCourseScore[] = [];

  showCardsModal = false;
  showCoursesModal = false;
  isSavingScore = false;
  isSavingCourse = false;
  newCourseName = '';

  randomCards: any[][] = [];
  currentUser: any = null;

  readonly editableFields = ['total_score'];

  get hasCourses(): boolean {
    return this.courses.length > 0;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  get selectedTotalScore(): number {
    if (!this.hasCourses) {
      return (
        Number(this.selectedRow?.total_score ?? 0) +
        Number(this.currentSelectedRow?.total_score ?? 0)
      );
    }

    return this.selectedCourseScores.reduce(
      (sum, courseScore) => sum + Number(courseScore.score ?? 0),
      0,
    );
  }

  async ngOnInit() {
    const storedUser = localStorage.getItem('putteputtern_logged_in_user');
    this.currentUser = storedUser ? JSON.parse(storedUser) : null;

    await this.loadProfilesAndTurnament();
  }

  async loadProfilesAndTurnament() {
    const [{ data: profiles }, { data: turnament }] = await Promise.all([
      this.supabase.from('profiles').select('*'),
      this.supabase.from('turnament').select('*'),
    ]);

    this.profiles = (profiles || []).filter(
      (profile: any) => profile.role === 'user',
    );

    const allowedProfileIds = new Set(
      this.profiles.map((profile) => profile.id),
    );

    this.rows = (turnament || []).filter((row: any) =>
      allowedProfileIds.has(row['profile$id']),
    );

    const existingIds = new Set(this.rows.map((row) => row['profile$id']));
    const missingProfiles = this.profiles.filter(
      (profile) => !existingIds.has(profile.id),
    );

    for (const profile of missingProfiles) {
      const newRow = {
        profile$id: profile.id,
        total_score: 0,
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

    await this.loadCoursesAndScores();
    this.applyCourseTotalsToRows();
    this.sortRows();
  }

  async loadCoursesAndScores() {
    const { data: courses, error: coursesError } = await this.supabase
      .from('turnament_courses')
      .select('*')
      .order('id', { ascending: true });

    if (coursesError) {
      console.error('Kunne ikke hente baner:', coursesError);
      this.courses = [];
      this.courseScores = [];
      return;
    }

    this.courses = courses || [];

    const { data: courseScores, error: courseScoresError } =
      await this.supabase.from('turnament_course_scores').select('*');

    if (courseScoresError) {
      console.error('Kunne ikke hente banescore:', courseScoresError);
      this.courseScores = [];
      return;
    }

    this.courseScores = courseScores || [];
  }

  sortRows() {
    this.rows.sort(
      (a, b) =>
        Number(a.total_score ?? 0) - Number(b.total_score ?? 0) ||
        Number(b.total_birdies ?? 0) - Number(a.total_birdies ?? 0) ||
        Number(a['profile$id'] ?? 0) - Number(b['profile$id'] ?? 0),
    );
  }

  applyCourseTotalsToRows() {
    if (!this.hasCourses) {
      return;
    }

    this.rows = this.rows.map((row) => ({
      ...row,
      total_score: this.getCourseTotalForProfile(row['profile$id']),
    }));
  }

  getCourseTotalForProfile(profileId: number): number {
    return this.courses.reduce(
      (sum, course) =>
        sum + Number(this.getStoredCourseScore(profileId, course.id)?.score ?? 0),
      0,
    );
  }

  getStoredCourseScore(profileId: number, courseId: number) {
    return this.courseScores.find(
      (score) => score.profile_id === profileId && score.course_id === courseId,
    );
  }

  async removeRow(row: any) {
    if (!this.isAdmin) {
      alert('Bare admin kan slette score-rader.');
      return;
    }

    const rowProfile = this.getProfile(row['profile$id']);
    if (rowProfile == undefined || Number(row.total_score ?? 0) === 0) {
      const { error } = await this.supabase
        .from('turnament')
        .delete()
        .eq('id', row.id);

      if (!error) {
        this.rows = this.rows.filter((r) => r.id !== row.id);
        this.closeEditModal();
      } else {
        console.error('Feil ved sletting:', error);
      }
    } else {
      alert('Du må slette brukeren eller nulle ut scoren før du kan slette');
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
      total_score: 0,
    };
    this.selectedIndex = index;
    this.selectedProfile = this.getProfile(row['profile$id']);
    this.selectedCourseScores = this.createEditableCourseScores(row);
  }

  closeEditModal() {
    this.selectedRow = null;
    this.currentSelectedRow = null;
    this.selectedProfile = null;
    this.selectedIndex = null;
    this.selectedCourseScores = [];
    this.isSavingScore = false;
  }

  createEditableCourseScores(row: any): EditableCourseScore[] {
    return this.courses.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      score: Number(
        this.getStoredCourseScore(row['profile$id'], course.id)?.score ?? 0,
      ),
    }));
  }

  adjust(field: string, delta: number) {
    if (!this.canEditRow(this.selectedRow) || this.hasCourses) {
      return;
    }

    if (this.currentSelectedRow && ['total_score'].includes(field)) {
      this.currentSelectedRow[field] += delta;
    }
  }

  adjustCourseScore(courseScore: EditableCourseScore, delta: number) {
    if (!this.canEditRow(this.selectedRow)) {
      return;
    }

    courseScore.score += delta;
  }

  async saveEdits() {
    if (!this.canEditRow(this.selectedRow)) {
      alert('Du kan bare lagre score på din egen profil.');
      return;
    }

    if (this.hasCourses) {
      await this.saveCourseScores();
      return;
    }

    await this.saveDirectTotalScore();
  }

  async saveDirectTotalScore() {
    const updated = {
      total_score: this.selectedTotalScore,
    };

    this.isSavingScore = true;

    const { error } = await this.supabase
      .from('turnament')
      .update(updated)
      .eq('id', this.selectedRow.id);

    this.isSavingScore = false;

    if (!error) {
      const index = this.rows.findIndex((r) => r.id === this.selectedRow.id);
      if (index !== -1) {
        this.rows[index] = { ...this.selectedRow, ...updated };
        this.sortRows();
      }
      this.closeEditModal();
    } else {
      console.error('Feil ved oppdatering:', error);
      alert('Kunne ikke lagre endringer.');
    }
  }

  async saveCourseScores() {
    const profileId = this.selectedRow['profile$id'];
    const totalScore = this.selectedTotalScore;

    const payload = this.selectedCourseScores.map((courseScore) => ({
      profile_id: profileId,
      course_id: courseScore.courseId,
      score: courseScore.score,
      updated_at: new Date().toISOString(),
    }));

    this.isSavingScore = true;

    const { data, error } = await this.supabase
      .from('turnament_course_scores')
      .upsert(payload, { onConflict: 'profile_id,course_id' })
      .select();

    if (error) {
      this.isSavingScore = false;
      console.error('Feil ved lagring av banescore:', error);
      alert('Kunne ikke lagre banescore.');
      return;
    }

    const { error: turnamentError } = await this.supabase
      .from('turnament')
      .update({ total_score: totalScore })
      .eq('id', this.selectedRow.id);

    this.isSavingScore = false;

    if (turnamentError) {
      console.error('Feil ved oppdatering av total score:', turnamentError);
      alert('Banescore ble lagret, men total score kunne ikke oppdateres.');
      return;
    }

    this.replaceCourseScoresForProfile(profileId, data || []);
    this.updateRowTotal(this.selectedRow.id, totalScore);
    this.closeEditModal();
  }

  replaceCourseScoresForProfile(
    profileId: number,
    updatedScores: TurnamentCourseScore[],
  ) {
    const updatedCourseIds = new Set(
      updatedScores.map((score) => score.course_id),
    );

    this.courseScores = [
      ...this.courseScores.filter(
        (score) =>
          score.profile_id !== profileId ||
          !updatedCourseIds.has(score.course_id),
      ),
      ...updatedScores,
    ];
  }

  updateRowTotal(rowId: number, totalScore: number) {
    const index = this.rows.findIndex((row) => row.id === rowId);
    if (index !== -1) {
      this.rows[index] = {
        ...this.rows[index],
        total_score: totalScore,
      };
      this.sortRows();
    }
  }

  openCoursesModal() {
    if (!this.isAdmin) {
      return;
    }

    this.showCoursesModal = true;
  }

  closeCoursesModal() {
    this.showCoursesModal = false;
    this.newCourseName = '';
    this.isSavingCourse = false;
  }

  async addCourse() {
    const courseName = this.newCourseName.trim();
    if (!courseName || !this.isAdmin) {
      return;
    }

    this.isSavingCourse = true;

    const { data, error } = await this.supabase
      .from('turnament_courses')
      .insert([{ name: courseName }])
      .select()
      .single();

    this.isSavingCourse = false;

    if (error) {
      console.error('Feil ved oppretting av bane:', error);
      alert('Kunne ikke legge til bane.');
      return;
    }

    this.courses = [...this.courses, data].sort((a, b) => a.id - b.id);
    this.newCourseName = '';
    this.applyCourseTotalsToRows();
    this.sortRows();

    if (this.selectedRow) {
      this.selectedCourseScores = this.createEditableCourseScores(
        this.selectedRow,
      );
    }
  }

  async deleteCourse(course: TurnamentCourse) {
    if (!this.isAdmin) {
      return;
    }

    const shouldDelete = window.confirm(`Slette banen "${course.name}"?`);
    if (!shouldDelete) {
      return;
    }

    const { error } = await this.supabase
      .from('turnament_courses')
      .delete()
      .eq('id', course.id);

    if (error) {
      console.error('Feil ved sletting av bane:', error);
      alert('Kunne ikke slette bane.');
      return;
    }

    this.courses = this.courses.filter(
      (existingCourse) => existingCourse.id !== course.id,
    );
    this.courseScores = this.courseScores.filter(
      (score) => score.course_id !== course.id,
    );

    this.applyCourseTotalsToRows();
    this.sortRows();

    if (this.selectedRow) {
      this.selectedCourseScores = this.createEditableCourseScores(
        this.selectedRow,
      );
    }
  }

  getPlacement(index: number): string | number {
    const current = this.rows[index];
    const currentScore = Number(current.total_score ?? 0);

    let placement = 1;
    for (let i = 0; i < index; i++) {
      const prevScore = Number(this.rows[i].total_score ?? 0);
      if (prevScore < currentScore) {
        placement++;
      } else if (prevScore === currentScore) {
        // Hvis samme score finnes tidligere, bruk samme plassering som den forrige
        return this.getPlacement(i);
      }
    }

    switch (placement) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return placement;
    }
  }

  generateRandomCards() {
    if (this.randomCards.length < 1) {
      let amount = this.rows.length;

      let moduloPlayers = amount % 4;
      let amountOfCards = Math.floor(amount / 4);
      if (moduloPlayers >= 2) {
        amountOfCards += 1;
      }
      console.log('Players: ' + amount + '| amountOfCards: ' + amountOfCards);

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
    console.log(this.randomCards);
  }

  openCardsModal() {
    this.showCardsModal = true;
    this.generateRandomCards();
  }

  closeCardsModal() {
    this.showCardsModal = false;
    this.randomCards = [];
  }

  canEditRow(row: any): boolean {
    if (!this.currentUser || !row) return false;

    return (
      this.currentUser.role === 'admin' ||
      row['profile$id'] === this.currentUser.id
    );
  }
}
