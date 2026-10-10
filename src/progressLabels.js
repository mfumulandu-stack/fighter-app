// Texte der Profil-Fortschrittskarte je Schritt (Schluessel aus growth.js).
// Unbekannte Schluessel zeigen den deutschen Originaltext.
const LABELS = {
  gym: ['Trage dein Gym ein', 'Add your gym', 'Renseigne ta salle', 'Añade tu gimnasio'],
  country: ['Wähle dein Land', 'Choose your country', 'Choisis ton pays', 'Elige tu país'],
  record: ['Trage deine Kämpfe ein oder bestätige „Ich habe noch keine Kämpfe“', 'Enter your fights or confirm "I have no fights yet"', "Saisis tes combats ou confirme « Je n'ai encore aucun combat »", 'Introduce tus combates o confirma «Aún no tengo combates»'],
  avatar: ['Lade ein Profilbild hoch', 'Upload a profile photo', 'Charge une photo de profil', 'Sube una foto de perfil'],
  style: ['Wähle deinen Kampfstil', 'Choose your fighting style', 'Choisis ton style de combat', 'Elige tu estilo de combate'],
  weight: ['Wähle deine Gewichtsklasse', 'Choose your weight class', 'Choisis ta catégorie de poids', 'Elige tu categoría de peso'],
  bio: ['Schreibe etwas über dich', 'Write something about yourself', 'Écris quelque chose sur toi', 'Escribe algo sobre ti'],
  gymver: ['Verifiziere deine Gym-Mitgliedschaft', 'Verify your gym membership', "Vérifie ton adhésion à la salle", 'Verifica tu membresía del gimnasio'],
};

export const PROGRESS_KEYS = Object.keys(LABELS);

// L(de,en,fr,es) kommt aus makeL(appLang)
export function progressLabel(k, fallback, L) {
  const e = LABELS[k];
  return e ? L(e[0], e[1], e[2], e[3]) : fallback;
}
