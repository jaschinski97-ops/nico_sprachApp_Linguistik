import {
  createCardState,
  DAY_MS,
  DEFAULT_WEIGHTS,
  dueCards,
  isDue,
  NEW_CARDS_PER_SESSION,
  nextIntervalDays,
  retrievability,
  reviewCard,
} from './fsrs';
import { FSRSCardState, Rating } from './types';

const T0 = Date.UTC(2026, 0, 1);

function newCard(): FSRSCardState {
  return createCardState('gai', 'th_to_de', T0);
}

/** Karte, die bereits einmal mit `rating` bewertet wurde. */
function reviewedCard(rating: Rating = 3): FSRSCardState {
  return reviewCard(newCard(), rating, T0);
}

describe('createCardState', () => {
  it('legt eine sofort faellige Karte ohne Stabilitaet an', () => {
    const card = newCard();
    expect(card.state).toBe('new');
    expect(card.stability).toBeNull();
    expect(card.difficulty).toBeNull();
    expect(card.lastReview).toBeNull();
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(isDue(card, T0)).toBe(true);
  });
});

describe('retrievability', () => {
  it('ist 0 fuer eine noch nie bewertete Karte', () => {
    expect(retrievability(newCard(), T0)).toBe(0);
  });

  it('ist 1 unmittelbar nach der Bewertung', () => {
    const card = reviewedCard();
    expect(retrievability(card, T0)).toBeCloseTo(1, 10);
  });

  it('folgt (1 + (19/81) * t / S) ^ -0.5', () => {
    const card = reviewedCard();
    const stability = card.stability!;
    const elapsedDays = 10;

    const expected = Math.pow(1 + ((19 / 81) * elapsedDays) / stability, -0.5);
    expect(retrievability(card, T0 + elapsedDays * DAY_MS)).toBeCloseTo(expected, 12);
  });

  it('faellt streng monoton mit der Zeit', () => {
    const card = reviewedCard();
    const values = [0, 1, 5, 20, 100].map((d) => retrievability(card, T0 + d * DAY_MS));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1]);
    }
  });

  it('behandelt eine Bewertung in der Zukunft wie t = 0 statt negativ zu rechnen', () => {
    const card = reviewedCard();
    expect(retrievability(card, T0 - 5 * DAY_MS)).toBeCloseTo(1, 10);
  });

  it('ergibt am Faelligkeitszeitpunkt ungefaehr die Zielretention von 0,9', () => {
    const card = reviewedCard(4);
    // Die Rundung auf ganze Tage in nextIntervalDays macht den Wert ungenau,
    // deshalb bewusst grob geprueft.
    expect(retrievability(card, card.due)).toBeGreaterThan(0.85);
    expect(retrievability(card, card.due)).toBeLessThan(0.95);
  });
});

describe('nextIntervalDays', () => {
  it('ist mindestens ein Tag, auch bei winziger Stabilitaet', () => {
    expect(nextIntervalDays(0.01)).toBe(1);
    expect(nextIntervalDays(0.1)).toBe(1);
  });

  it('waechst monoton mit der Stabilitaet', () => {
    const intervals = [1, 5, 20, 90, 365].map(nextIntervalDays);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it('liegt bei S = 100 nahe an S selbst (Zielretention 0,9)', () => {
    // S * (0.9^-2 - 1) / (19/81) entspricht bei Zielretention 0,9 etwa S.
    expect(nextIntervalDays(100)).toBeGreaterThan(90);
    expect(nextIntervalDays(100)).toBeLessThan(110);
  });
});

describe('reviewCard - Erstbewertung', () => {
  it('setzt die Stabilitaet auf W[rating - 1]', () => {
    ([1, 2, 3, 4] as Rating[]).forEach((rating) => {
      const card = reviewCard(newCard(), rating, T0);
      expect(card.stability).toBeCloseTo(DEFAULT_WEIGHTS[rating - 1], 12);
    });
  });

  it('vergibt fuer bessere Bewertungen eine niedrigere Difficulty', () => {
    const difficulties = ([1, 2, 3, 4] as Rating[]).map(
      (rating) => reviewCard(newCard(), rating, T0).difficulty!
    );
    for (let i = 1; i < difficulties.length; i++) {
      expect(difficulties[i]).toBeLessThan(difficulties[i - 1]);
    }
  });

  it('haelt die Difficulty im Bereich 1..10', () => {
    ([1, 2, 3, 4] as Rating[]).forEach((rating) => {
      const difficulty = reviewCard(newCard(), rating, T0).difficulty!;
      expect(difficulty).toBeGreaterThanOrEqual(1);
      expect(difficulty).toBeLessThanOrEqual(10);
    });
  });

  it('zaehlt reps hoch und setzt lastReview sowie due', () => {
    const card = reviewCard(newCard(), 3, T0);
    expect(card.reps).toBe(1);
    expect(card.lastReview).toBe(T0);
    expect(card.due).toBe(T0 + nextIntervalDays(card.stability!) * DAY_MS);
    expect(card.due).toBeGreaterThan(T0);
  });

  it('laesst die Eingabekarte unveraendert', () => {
    const original = newCard();
    const snapshot = { ...original };
    reviewCard(original, 3, T0);
    expect(original).toEqual(snapshot);
  });
});

describe('reviewCard - Folgebewertungen', () => {
  it('zaehlt Nochmal als Lapse und stuft die Karte auf learning zurueck', () => {
    const first = reviewedCard(3);
    const lapsed = reviewCard(first, 1, T0 + 10 * DAY_MS);

    expect(lapsed.lapses).toBe(1);
    expect(lapsed.reps).toBe(2);
    expect(lapsed.state).toBe('learning');
    expect(lapsed.stability!).toBeLessThan(first.stability!);
  });

  it('zaehlt gute Bewertungen nicht als Lapse', () => {
    const first = reviewedCard(3);
    const again = reviewCard(first, 3, T0 + 10 * DAY_MS);
    expect(again.lapses).toBe(0);
  });

  it('laesst die Stabilitaet bei Gut wachsen', () => {
    const first = reviewedCard(3);
    const second = reviewCard(first, 3, T0 + 10 * DAY_MS);
    expect(second.stability!).toBeGreaterThan(first.stability!);
  });

  it('belohnt Leicht staerker als Gut und Gut staerker als Schwer', () => {
    const first = reviewedCard(3);
    const at = T0 + 10 * DAY_MS;

    const hard = reviewCard(first, 2, at).stability!;
    const good = reviewCard(first, 3, at).stability!;
    const easy = reviewCard(first, 4, at).stability!;

    expect(easy).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(hard);
  });

  it('senkt die Difficulty bei Leicht und hebt sie bei Nochmal', () => {
    const first = reviewedCard(3);
    const at = T0 + 10 * DAY_MS;

    expect(reviewCard(first, 4, at).difficulty!).toBeLessThan(first.difficulty!);
    expect(reviewCard(first, 1, at).difficulty!).toBeGreaterThan(first.difficulty!);
  });

  it('haelt Difficulty und Stabilitaet auch nach vielen Lapses in ihren Grenzen', () => {
    let card = reviewedCard(1);
    for (let i = 0; i < 50; i++) {
      card = reviewCard(card, 1, T0 + (i + 1) * DAY_MS);
      expect(card.difficulty!).toBeGreaterThanOrEqual(1);
      expect(card.difficulty!).toBeLessThanOrEqual(10);
      expect(card.stability!).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('markiert die Karte ab mehr als 21 Tagen Stabilitaet als gemeistert', () => {
    let card = reviewedCard(4);
    for (let i = 0; i < 10 && card.stability! <= 21; i++) {
      card = reviewCard(card, 4, card.due);
    }
    expect(card.stability!).toBeGreaterThan(21);
    expect(card.state).toBe('mastered');
  });

  it('vergibt bei spaeter Wiederholung mehr Stabilitaet als bei sofortiger', () => {
    // Niedrigere Retrievability zum Zeitpunkt der Bewertung bedeutet mehr
    // Lerngewinn - das ist der Kern des Abstandseffekts.
    const first = reviewedCard(3);
    const soon = reviewCard(first, 3, T0 + 1 * DAY_MS).stability!;
    const late = reviewCard(first, 3, T0 + 30 * DAY_MS).stability!;
    expect(late).toBeGreaterThan(soon);
  });
});

describe('isDue / dueCards', () => {
  it('erkennt den Faelligkeitszeitpunkt selbst als faellig', () => {
    const card = reviewedCard(3);
    expect(isDue(card, card.due - 1)).toBe(false);
    expect(isDue(card, card.due)).toBe(true);
  });

  it('stellt bereits gelernte Karten VOR neue - schwaechste zuerst', () => {
    const fresh = createCardState('neu', 'th_to_de', T0);
    // "Leicht" vor 10 Tagen: Intervall 6 Tage, also seit 4 Tagen faellig, aber
    // noch gut erinnert (hohe Retrievability).
    const strong = reviewCard(createCardState('stark', 'th_to_de', T0), 4, T0 - 10 * DAY_MS);
    // "Nochmal" vor einem Tag: Intervall 1 Tag, gerade faellig und schwach.
    const weak = reviewCard(createCardState('schwach', 'th_to_de', T0), 1, T0 - 1 * DAY_MS);
    const notDue = reviewCard(createCardState('spaeter', 'th_to_de', T0), 4, T0);

    expect(isDue(strong, T0)).toBe(true);
    expect(isDue(weak, T0)).toBe(true);
    expect(isDue(notDue, T0)).toBe(false);

    const due = dueCards([strong, notDue, fresh, weak], T0);

    // Fällige Karten zuerst, darunter die schwaechere vor der besser
    // erinnerten; die neue Karte (R = 0) kommt ERST DANACH — sonst wuerde sie
    // bei grossem Grundstock jede Sitzung fluten (siehe naechster Test).
    expect(due.map((card) => card.vocabId)).toEqual(['schwach', 'stark', 'neu']);
  });

  it('deckelt neue Karten je Zusammenstellung, damit faellige nicht verhungern', () => {
    // 30 nie bewertete Karten sind sofort faellig - dazu zwei bereits
    // gelernte, die eigentlich dran waeren.
    const freshCards = Array.from({ length: 30 }, (_, i) => createCardState(`neu-${i}`, 'th_to_de', T0));
    const weak = reviewCard(createCardState('schwach', 'th_to_de', T0), 1, T0 - 1 * DAY_MS);
    const strong = reviewCard(createCardState('stark', 'th_to_de', T0), 4, T0 - 10 * DAY_MS);

    const due = dueCards([...freshCards, weak, strong], T0);

    expect(due).toHaveLength(NEW_CARDS_PER_SESSION + 2);
    // Die fälligen Karten zuerst ...
    expect(due.slice(0, 2).map((card) => card.vocabId)).toEqual(['schwach', 'stark']);
    // ... dann hoechstens NEW_CARDS_PER_SESSION neue.
    expect(due.slice(2).every((card) => card.state === 'new')).toBe(true);
  });
});
