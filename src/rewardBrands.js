// Teil des Freunde-einladen-Rabatt-Systems: legt fest, in welcher
// Reihenfolge Marken-Rabattcodes (Equipment & Supplements) freigeschaltet
// werden. Freigeschaltet wird NACH MARKE, nicht nach Produkt - eine Marke
// mit mehreren Produkten zaehlt nur einmal. Die Reihenfolge richtet sich
// danach, welche Marke zuerst zu Fighter dazugekommen ist (fruehestes
// created_at unter ihren Produkten mit Rabattcode), bei Gleichstand
// alphabetisch - so bleibt die Reihenfolge stabil und nachvollziehbar.
//
// WICHTIG: Diese Datei wird sowohl von EquipmentScreen.js (zeigt die
// Codes an) als auch von App.js (zeigt den Fortschritt in "Mein Profil"
// an) genutzt - beide MUESSEN dieselbe Reihenfolge berechnen, sonst
// widersprechen sich die beiden Ansichten.

const brandKey = s => (s || '').trim().toLowerCase();

// items: Zeilen aus der equipment-Tabelle (mind. brand, discount_code,
// created_at - item_type ist hier bewusst egal, der Aufrufer filtert
// vorher schon auf Equipment ODER Supplements). Gibt zurueck:
// - order: Array von Markennamen-Schluesseln, aufsteigend nach
//   Freischalt-Reihenfolge - nur Marken MIT mindestens einem discount_code
// - labelByKey: Schluessel -> haeufigste Original-Schreibweise der Marke
export function computeBrandUnlockOrder(items) {
  const withCode = (items || []).filter(i => i && i.discount_code);
  const firstSeen = {};
  const variants = {};
  withCode.forEach(i => {
    const k = brandKey(i.brand);
    if (!k) return;
    const t = i.created_at ? new Date(i.created_at).getTime() : Infinity;
    if (!(k in firstSeen) || t < firstSeen[k]) firstSeen[k] = t;
    const v = (i.brand || '').trim();
    variants[k] = variants[k] || {};
    variants[k][v] = (variants[k][v] || 0) + 1;
  });
  const labelByKey = {};
  Object.keys(variants).forEach(k => {
    labelByKey[k] = Object.entries(variants[k]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0][0];
  });
  const order = Object.keys(firstSeen).sort((a, b) => {
    const ta = firstSeen[a], tb = firstSeen[b];
    if (ta !== tb) return ta - tb;
    return (labelByKey[a] || a).localeCompare(labelByKey[b] || b, 'de');
  });
  return { order, labelByKey };
}

// Rang (1-basiert) einer Marke in der Freischalt-Reihenfolge, oder null
// falls die Marke gar keinen Rabattcode hat / unbekannt ist.
export function brandRank(order, brand) {
  const k = brandKey(brand);
  const idx = order.indexOf(k);
  return idx === -1 ? null : idx + 1;
}

export { brandKey };
