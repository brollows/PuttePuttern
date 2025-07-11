import { Component } from '@angular/core';

@Component({
  selector: 'app-challenges',
  imports: [],
  templateUrl: './challenges.component.html',
  styleUrl: './challenges.component.css'
})
export class ChallengesComponent {

  challenges = [
    "Du må kommentere ditt eget kast fra tee som om det var vist på TV",
    "Du må rope ut en bestemt frase før eller etter hvert kast",
    "Du er gruppas heiagjeng. Du må applaudere og skryte av alle kast til motspillerene hele hullet. UANSETT UTFALD",
    "Du må gi en annen spiller en pep-talk før personen skal kaste",
    "Du må synge en tilfeldig linje fra en sang før kast fra tee",
    "Du må snakke høyt i kommandoform til discen (f.eks. “Fly, og ikke skuff meg!”)",
    "Du må gi teknisk instruksjon til gruppa etter kastene dems. Coach, hva må de jobbe med?",
    "Du må etterligne stemmen til en kjent karakter hele hullet ('Gollum', 'Hellstrøm', 'Yoda' osv.)",
    "Du må uansett hvordan kastet fra tee går, feire som om det var ace",
    "Du må finne på en falsk sponsor og rope ut navnet før kastet: “Denne driven er sponset av... f.eks Aktiv AS!”",
    "Gjør en danse bevegelse før du kaster fra tee",
    "Ta en moradi vits til en av de andre på gruppa di før du kaster fra tee",
    "Du må introdusere deg selv på engelsk med fullt navn og som om du er disc golf-proff før kast fra tee",
    "Du må stå som superhelt (power pose) i 5 sekunder før kast",
    "Du må forklare kastet ditt til de andre etterpå som om det var planlagt, uansett hvor ræva det var",
    "Du må snakke som en asiater hele hullet",
    "Du må ta på deg rollen som en full onkel i familieselskap",
    "Du må rangsjere de andre i gruppa di fre best til værst disc golfer",
    "Du er nå en tennis spiller. Moan for hvert kast hele hullet!",
    "Vær en weeabo hele hullet! 'Yamete kudasai', 'NYA'",
    "For å kunne kaste så må du ta den mest edgy joken du kan.",
    "Du har herved CP i beina for neste hull!"
  ];

  currentDisplayedChallenge = "";

  setRandomChallenge() {
    let index = Math.floor(Math.random() * this.challenges.length);
    this.currentDisplayedChallenge = this.challenges[index];
  }
}
