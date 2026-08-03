// Die zentrale Stilvorlage der App (Schriften, Grundlayout, Animationen,
// Dark-Mode-Regeln).
//
// Bewusst als eigene Datei ausgelagert, damit sie sowohl von App.js als
// auch von eigenstaendigen Ansichten wie AuthScreen eingebunden werden
// kann, ohne dafuer die grosse App.js importieren zu muessen.
//
// Eingebunden wird sie ueberall gleich:  <style>{css}</style>
//
// HINWEIS: Der Inhalt ist unveraendert aus App.js hierher verschoben.

export const css=`
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f5f5f7;font-family:'DM Sans',sans-serif}
.rj{font-family:'Rajdhani',sans-serif!important;font-weight:700}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fadeUp{animation:fadeUp 0.4s ease both}
.spin{animation:spin 0.8s linear infinite}
input,select,textarea{outline:none;font-family:'DM Sans',sans-serif}
input::placeholder,textarea::placeholder{color:#aaa}
body.dark{background:#0d0d0d!important;color:#fff}
body.dark .dm-bg{background:#0d0d0d!important}
body.dark .dm-card{background:#1a1a1a!important;border-color:#2a2a2a!important}
body.dark .dm-text{color:#fff!important}
body.dark .dm-sub{color:#aaa!important}
body.dark input,body.dark select,body.dark textarea{background:#111!important;color:#fff!important;border-color:#333!important}
body.dark input::placeholder{color:#555!important}
::-webkit-scrollbar{display:none}
textarea{resize:none}
`;
