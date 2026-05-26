import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

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
export class WheelComponent implements OnInit, OnDestroy {
  private readonly cooldownStorageKey = 'bogeyWheelCooldownEndsAt';
  private readonly resultStorageKey = 'bogeyWheelLastResult';

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

  rulesExpanded = false;

  challenges = [
    `Utkastet må kastes med putter. Ikke zone eller andre approach discer. Bruk den du ville puttet med. 
    
    (I tilfelle du heter Ole, så vet vi at du putter med hva som helst. Ikke vær vrang, du vet hva slags putter det er snakk om)`,
    `Kast grenade minst én gang i løpet av hullet. Grenade = kast discen nesten vertikalt opp med tommelen på innsiden av rimen.`,
    `Putt med ikke-dominant arm dette hullet.`,
    `Utkastet må kastes standstill, altså uten tilløp.`,
    `Ett kast på hullet må være en roller.`,
    `Ett kast på hullet må være patent pending. Det betyr et kast der du står litt vridd/baklengs.`,
    `Ett kast på hullet må være overhand, enten tomahawk eller thumber.`,
    `Ett kast på hullet må kastes med discen opp-ned.`,
    `Utkastet må kastes med den mest understabile discen du har med deg. Eller om noen på gruppa har en mer understabil disc.`,
    `Utkastet må kastes med den mest overstabile discen du har med deg. Eller om noen på gruppa har en mer overstabil disc.`,
    `La den andre på gruppa velge hvor du skal ta utkastet fra.`,
    `Gruppa velger en mando som gjelder for deg hele hullet.`,
    `Gruppa velger hvilken disc du skal kaste med. Denne discen skal brukes fra tee til den ligger i kurv.`,
    `Du må kaste to ganger fra tee. Du må fortsette å spille fra den dårligste discen. Gruppa bestemmer hvilken det er.`,
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
  ];

  ngOnInit() {
    this.restoreSpinCooldown();
    this.restoreStoredWheelResult();
  }

  get segmentCount(): number {
    return this.wheelSegments.length;
  }

  get segmentDegrees(): number {
    return 360 / this.segmentCount;
  }

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

  get canDismissCurrentResult(): boolean {
    return (
      !!this.currentDisplayedChallenge &&
      !this.isSpinning &&
      this.cooldownRemainingMs <= 0
    );
  }

  get cooldownText(): string {
    const totalSeconds = Math.ceil(this.cooldownRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  openWheel() {
    this.restoreSpinCooldown();
    this.restoreStoredWheelResult();

    this.wheelOpen = true;
    this.wheelStatusText = 'Trykk SPINN for å avgjøre skjebnen 👀';
  }

  closeWheel() {
    if (this.isSpinning) return;

    this.wheelOpen = false;
  }

  spinWheel() {
    if (this.isSpinDisabled) return;

    this.startSpinCooldown();

    this.isSpinning = true;
    this.clearStoredWheelResult();
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

  dismissCurrentResult() {
    if (!this.canDismissCurrentResult) return;

    this.clearStoredWheelResult();
  }

  ngOnDestroy() {
    this.clearCooldownInterval();
  }

  toggleRules() {
    this.rulesExpanded = !this.rulesExpanded;
  }

  collapseRules(event: MouseEvent) {
    event.stopPropagation();
    this.rulesExpanded = false;
  }

  private startSpinCooldown() {
    this.cooldownEndsAt = Date.now() + this.spinCooldownMs;
    this.saveCooldownEndsAt();
    this.startCooldownInterval();
  }

  private restoreSpinCooldown() {
    const storedCooldownEndsAt = localStorage.getItem(this.cooldownStorageKey);

    if (!storedCooldownEndsAt) {
      this.cooldownEndsAt = 0;
      this.cooldownRemainingMs = 0;
      return;
    }

    const parsedCooldownEndsAt = Number(storedCooldownEndsAt);

    if (
      !Number.isFinite(parsedCooldownEndsAt) ||
      parsedCooldownEndsAt <= Date.now()
    ) {
      this.clearStoredCooldown();
      return;
    }

    this.cooldownEndsAt = parsedCooldownEndsAt;
    this.startCooldownInterval();
  }

  private startCooldownInterval() {
    this.updateCooldownRemaining();
    this.clearCooldownInterval();

    if (this.cooldownRemainingMs <= 0) {
      this.clearStoredCooldown();
      return;
    }

    this.cooldownIntervalId = window.setInterval(() => {
      this.updateCooldownRemaining();

      if (this.cooldownRemainingMs <= 0) {
        this.clearStoredCooldown();
        this.clearCooldownInterval();
      }
    }, 1000);
  }

  private updateCooldownRemaining() {
    this.cooldownRemainingMs = Math.max(0, this.cooldownEndsAt - Date.now());
  }

  private saveCooldownEndsAt() {
    localStorage.setItem(this.cooldownStorageKey, String(this.cooldownEndsAt));
  }

  private clearStoredCooldown() {
    this.cooldownEndsAt = 0;
    this.cooldownRemainingMs = 0;
    localStorage.removeItem(this.cooldownStorageKey);
  }

  private saveWheelResult(resultText: string) {
    this.currentDisplayedChallenge = resultText;
    localStorage.setItem(this.resultStorageKey, resultText);
  }

  private restoreStoredWheelResult() {
    this.currentDisplayedChallenge =
      localStorage.getItem(this.resultStorageKey) || '';
  }

  private clearStoredWheelResult() {
    this.currentDisplayedChallenge = '';
    localStorage.removeItem(this.resultStorageKey);
  }

  private clearCooldownInterval() {
    if (this.cooldownIntervalId === null) return;

    window.clearInterval(this.cooldownIntervalId);
    this.cooldownIntervalId = null;
  }

  private handleWheelResult(segment: WheelSegment) {
    if (segment.type === 'challenge') {
      const challenge = this.getRandomChallenge();
      const resultText = `🟣 CHALLENGE: ${challenge}`;

      this.saveWheelResult(resultText);
      this.wheelStatusText = resultText;
      return;
    }

    this.saveWheelResult(segment.resultText);
    this.wheelStatusText = segment.resultText;
  }

  private getRandomChallenge(): string {
    const index = Math.floor(Math.random() * this.challenges.length);

    return this.challenges[index];
  }
}
