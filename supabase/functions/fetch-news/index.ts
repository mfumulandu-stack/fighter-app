// Supabase Edge Function: fetch-news
// Holt aktuelle Kampfsport-News von echten, seriösen externen Quellen
// (Sherdog fuer MMA, BoxingScene fuer Boxen) und gibt sie als
// einheitliches JSON zurueck. Zeigt nur Titel, kurze Beschreibung, Datum
// und einen Link zur Originalseite - keine vollstaendigen Artikeltexte
// (Urheberrecht der jeweiligen Quelle bleibt unangetastet, Nutzer lesen
// den vollen Artikel auf der Original-Website).

const FEEDS = [
  { url: "https://www.sherdog.com/rss/news.xml", source: "Sherdog (MMA)" },
  { url: "https://www.boxingscene.com/feed", source: "BoxingScene (Boxen)" },
];

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRssItems(xml: string, source: string) {
  const items: any[] = [];
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  for (const itemXml of itemMatches.slice(0, 12)) {
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    let description = extractTag(itemXml, "description");
    if (description.length > 200) description = description.slice(0, 200) + "...";
    if (title && link) {
      items.push({ title, link, pubDate, description, source });
    }
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  try {
    let allItems: any[] = [];
    for (const feed of FEEDS) {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FighterAppNewsBot/1.0)" },
        });
        if (res.ok) {
          const xml = await res.text();
          allItems = allItems.concat(parseRssItems(xml, feed.source));
        }
      } catch (e) {
        console.error("Feed-Fehler " + feed.source, e);
      }
    }

    // Nach Datum sortieren (neueste zuerst)
    allItems.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    return new Response(JSON.stringify({ success: true, items: allItems.slice(0, 25) }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
