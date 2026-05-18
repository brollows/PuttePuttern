import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';

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
export class WheelComponent implements OnDestroy {
  readonly segmentCount = 9;
  readonly segmentDegrees = 360 / this.segmentCount;
  readonly spinDurationMs = 10000;

  readonly spinCooldownMs = 5 * 60 * 1000;

  wheelOpen = false;
  isSpinning = false;
  wheelRotation = 0;

  cooldownRemainingMs = 0;
  private cooldownIntervalId: number | null = null;
  private cooldownEndsAt = 0;

  wheelStatusText = 'Trykk SPINN for å avgjøre skjebnen 👀';
  currentDisplayedChallenge = '';

  challenges = [
    'Kast grenade minst én gang i løpet av hullet. Grenade = kast discen nesten vertikalt opp med tommelen på innsiden av rimen.',
    'Putt med ikke-dominant arm dette hullet.',
    'Utkastet må kastes standstill, altså uten tilløp.',
    'Ett kast på hullet må være en roller.',
    'Ett kast på hullet må være patent pending. Det betyr et kast der du står litt vridd/baklengs.',
    'Ett kast på hullet må være overhand, enten tomahawk eller thumber.',
    'Utkastet må kastes med putter. Ikke zone eller andre approach discer. Bruk den du ville puttet med',
    'Ett kast på hullet må kastes med discen opp-ned.',
    'Utkastet må kastes med den mest understabile discen du har med deg. Eller om noen på gruppa har en mer understabil disc.',
    'Utkastet må kastes med den mest overstabile discen du har med deg. Eller om noen på gruppa har en mer overstabil disc.',
    'La den andre på gruppa velge hvor du skal ta utkastet fra.',
    'Gruppa velger en mando som gjelder for deg hele hullet.',
    'Gruppa velger hvilken disc du skal kaste med. Denne discen skal brukes fra tee til den ligger i kurv.',
    'Du må kaste to ganger fra tee. Du må fortsette å spille fra den dårligste discen. Gruppa bestemmer hvilken det er.',
  ];

  wheelSegments: WheelSegment[] = [
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
    },
    {
      type: 'mulligan',
      label: 'MULLIGAN',
      resultText: '🟢 MULLIGAN! Du får kaste på nytt!',
      color: '#31f58f',
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
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
    },
    {
      type: 'challenge',
      label: 'CHALLENGE',
      resultText: '',
      color: '#b78bff',
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

  get isSpinDisabled(): boolean {
    return this.isSpinning || this.cooldownRemainingMs > 0;
  }

  get cooldownText(): string {
    const totalSeconds = Math.ceil(this.cooldownRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  openWheel() {
    this.wheelOpen = true;
    this.wheelStatusText = 'Trykk SPINN for å avgjøre skjebnen 👀';
    this.currentDisplayedChallenge = '';
  }

  closeWheel() {
    if (this.isSpinning) return;

    this.wheelOpen = false;
  }

  spinWheel() {
    if (this.isSpinDisabled) return;

    this.startSpinCooldown();

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

  ngOnDestroy() {
    this.clearCooldownInterval();
  }

  private startSpinCooldown() {
    this.cooldownEndsAt = Date.now() + this.spinCooldownMs;
    this.updateCooldownRemaining();

    this.clearCooldownInterval();

    this.cooldownIntervalId = window.setInterval(() => {
      this.updateCooldownRemaining();

      if (this.cooldownRemainingMs <= 0) {
        this.clearCooldownInterval();
      }
    }, 1000);
  }

  private updateCooldownRemaining() {
    this.cooldownRemainingMs = Math.max(0, this.cooldownEndsAt - Date.now());
  }

  private clearCooldownInterval() {
    if (this.cooldownIntervalId === null) return;

    window.clearInterval(this.cooldownIntervalId);
    this.cooldownIntervalId = null;
  }

  private handleWheelResult(segment: WheelSegment) {
    if (segment.type === 'challenge') {
      const challenge = this.getRandomChallenge();

      segment.resultText = `🟣 CHALLENGE: ${challenge}`;

      this.currentDisplayedChallenge = segment.resultText;
      this.wheelStatusText = segment.resultText;
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
