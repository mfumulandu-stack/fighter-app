// Supabase Edge Function: smart-redirect
// Erkennt anhand des User-Agents, ob jemand vom Handy oder Computer aus
// klickt, und leitet entsprechend weiter:
//   - iPhone/Android (App vermutlich installiert, da bestehender Nutzer)
//     -> versucht die App per eigenem URL-Schema zu oeffnen, faellt bei
//        Fehlschlag automatisch auf den App Store zurueck
//   - Laptop/Desktop -> direkt zur Website, Equipment-Bereich
//
// Aufruf per Link: https://uykdrmymjvqgebsmndme.supabase.co/functions/v1/smart-redirect?to=equipment

const APP_STORE_URL = "https://apps.apple.com/app/id6779692192";
const WEBSITE_URL = "https://fighterapp.de";
// Eigenes URL-Schema der App (aus capacitor.config.ts / Android Manifest)
const APP_SCHEME = "fighter";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const target = url.searchParams.get("to") || "equipment";
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  const isMobile = /iphone|ipad|ipod|android/.test(userAgent);

  if (isMobile) {
    // Versucht die App per eigenem Schema zu oeffnen. Ist sie nicht
    // installiert, passiert nach kurzer Wartezeit automatisch der
    // Rueckfall zum App Store (funktioniert zuverlaessig ueber eine
    // kleine HTML-Zwischenseite, da reine Server-Redirects das nicht
    // zuverlaessig koennen).
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Fighter App</title></head>
<body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding-top:80px;">
  <p>Öffne Fighter App...</p>
  <script>
    window.location.href = "${APP_SCHEME}://${target}";
    setTimeout(function(){ window.location.href = "${APP_STORE_URL}"; }, 1500);
  </script>
  <p style="margin-top:40px;"><a href="${APP_STORE_URL}" style="color:#c0392b;">Öffnet sich nicht automatisch? Hier tippen</a></p>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Desktop/Laptop: direkt zur Website, passendem Bereich
  return Response.redirect(`${WEBSITE_URL}?section=${target}`, 302);
});
