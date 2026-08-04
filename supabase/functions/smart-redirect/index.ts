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
    // Rueckfall zum App Store. Bewusst nur einfache ASCII-Zeichen im
    // Text verwendet (kein "Ö" o.ae.), um Kodierungsprobleme in manchen
    // eingebetteten Browsern (z.B. Mail-Apps) sicher zu vermeiden.
    const html = "<!DOCTYPE html>\n" +
      "<html><head><meta charset=\"UTF-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<title>Fighter App</title></head>\n" +
      "<body style=\"background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding-top:80px;\">\n" +
      "  <p>Oeffne Fighter App...</p>\n" +
      "  <script>\n" +
      "    window.location.href = \"" + APP_SCHEME + "://" + target + "\";\n" +
      "    setTimeout(function(){ window.location.href = \"" + APP_STORE_URL + "\"; }, 1500);\n" +
      "  </script>\n" +
      "  <p style=\"margin-top:40px;\"><a href=\"" + APP_STORE_URL + "\" style=\"color:#c0392b;\">" +
      "Oeffnet sich nicht automatisch? Hier tippen</a></p>\n" +
      "</body></html>";

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // Desktop/Laptop: direkt zur Website, passendem Bereich
  return new Response(null, {
    status: 302,
    headers: {
      "Location": WEBSITE_URL + "?section=" + target,
    },
  });
});
