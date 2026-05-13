import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type WheelResultType = 'mulligan' | 'plusOne' | 'challenge';

interface WheelSegment {
  type: WheelResultType;
  label: string;
  resultText: string;
  color: string;
}

@Component({
  selector: 'app-wheel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wheel.component.html',
  styleUrl: './wheel.component.css',
})
export class WheelComponent {
  readonly segmentCount = 9;
  readonly segmentDegrees = 360 / this.segmentCount;
  readonly spinDurationMs = 10000;

  wheelOpen = false;
  isSpinning = false;
  wheelRotation = 0;

  wheelStatusText = 'Trykk SPINN for å avgjøre skjebnen 👀';
  currentDisplayedChallenge = '';

  challenges = [
    'Du må kommentere ditt eget kast fra tee som om det var vist på TV',
    'Du må rope ut en bestemt frase før eller etter hvert kast',
    'Du er gruppas heiagjeng. Du må applaudere og skryte av alle kast til motspillerene hele hullet. UANSETT UTFALL',
    'Du må gi en annen spiller en pep-talk før personen skal kaste',
    'Du må synge en tilfeldig linje fra en sang før kast fra tee',
    'Du må snakke høyt i kommandoform til discen, f.eks. “Fly, og ikke skuff meg!”',
    'Du må gi teknisk instruksjon til gruppa etter kastene deres. Coach, hva må de jobbe med?',
    'Du må etterligne stemmen til en kjent karakter hele hullet',
    'Du må uansett hvordan kastet fra tee går, feire som om det var ace',
    'Du må finne på en falsk sponsor og rope ut navnet før kastet',
    'Gjør en dansebevegelse før du kaster fra tee',
    'Ta en moradi-vits til en av de andre på gruppa di før du kaster fra tee',
    'Du må introdusere deg selv på engelsk med fullt navn som om du er disc golf-proff før kast fra tee',
    'Du må stå som superhelt i power pose i 5 sekunder før kast',
    'Du må forklare kastet ditt etterpå som om det var planlagt, uansett hvor dårlig det var',
  ];

  wheelSegments: WheelSegment[] = [
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'plusOne',
      label: '+1 SCORE',
      resultText: '🔴 +1 PÅ SCORE! Brutalt. Rett på totalen.',
      color: '#ff4d6d',
    },
  ];

  get wheelGradient(): string {
    return this.wheelSegments
      .map((segment, index) => {
        const start = index * this.segmentDegrees;
        const end = (index + 1) * this.segmentDegrees;

        return `${segment.color} ${start}deg ${end}deg`;
      })
      .join(', ');
  }

  openWheel() {
    this.wheelOpen = true;
    this.wheelStatusText = 'Trykk SPINN for å avgjøre skjebnen 👀';
  }

  closeWheel() {
    if (this.isSpinning) return;

    this.wheelOpen = false;
  }

  spinWheel() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.currentDisplayedChallenge = '';
    this.wheelStatusText = 'Hjulet spinner...';

    const winningIndex = Math.floor(Math.random() * this.wheelSegments.length);
    const winningSegment = this.wheelSegments[winningIndex];

    const safeMargin = this.segmentDegrees * 0.18;

    const randomOffsetWithinSegment =
      safeMargin + Math.random() * (this.segmentDegrees - safeMargin * 2);

    const segmentTargetAngle =
      winningIndex * this.segmentDegrees + randomOffsetWithinSegment;

    const fullSpins = 10 + Math.floor(Math.random() * 5);
    const finalRotation = 360 - segmentTargetAngle;
    const currentNormalizedRotation = this.wheelRotation % 360;

    const nextRotation =
      this.wheelRotation +
      fullSpins * 360 +
      finalRotation -
      currentNormalizedRotation;

    requestAnimationFrame(() => {
      this.wheelRotation = nextRotation;
    });

    window.setTimeout(() => {
      this.isSpinning = false;
      this.handleWheelResult(winningSegment);
    }, this.spinDurationMs);
  }

  private handleWheelResult(segment: WheelSegment) {
    if (segment.type === 'challenge') {
      const challenge = this.getRandomChallenge();

      this.currentDisplayedChallenge = `🟣 CHALLENGE: ${challenge}`;
      this.wheelStatusText = '🟣 CHALLENGE!';
      return;
    }

    this.currentDisplayedChallenge = segment.resultText;
    this.wheelStatusText = segment.resultText;
  }

  private getRandomChallenge(): string {
    const index = Math.floor(Math.random() * this.challenges.length);

    return this.challenges[index];
  }
}
