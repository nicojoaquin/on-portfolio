import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

interface ScrapedQuote {
  ticker: string;
  lastPrice: number;
}

async function scrapeIOL(): Promise<ScrapedQuote[]> {
  try {
    const res = await fetch(
      "https://iol.invertironline.com/mercado/cotizaciones/argentina/obligaciones-negociables/todos",
      { next: { revalidate: 0 }, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await res.text();
    const $ = cheerio.load(html);
    const quotes: ScrapedQuote[] = [];

    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const ticker = $(cells[0]).text().trim();
      const lastStr = $(cells[1]).text().trim().replace(/\./g, "").replace(",", ".");
      const lastPrice = parseFloat(lastStr);
      if (!ticker || isNaN(lastPrice) || lastPrice <= 0) return;

      quotes.push({ ticker, lastPrice });
    });

    return quotes;
  } catch {
    return [];
  }
}

async function scrapeBolsar(): Promise<ScrapedQuote[]> {
  try {
    const res = await fetch(
      "https://bolsar.info/Obligaciones_Negociables.php",
      { next: { revalidate: 0 }, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await res.text();
    const $ = cheerio.load(html);
    const quotes: ScrapedQuote[] = [];

    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 6) return;

      const ticker = $(cells[0]).text().trim();
      const lastStr = $(cells[5]).text().trim().replace(/\./g, "").replace(",", ".");
      const lastPrice = parseFloat(lastStr);
      if (!ticker || isNaN(lastPrice) || lastPrice <= 0) return;

      quotes.push({ ticker, lastPrice });
    });

    return quotes;
  } catch {
    return [];
  }
}

export async function GET() {
  const [iolQuotes, bolsarQuotes] = await Promise.all([
    scrapeIOL(),
    scrapeBolsar(),
  ]);

  // Merge: IOL takes priority
  const quoteMap = new Map<string, number>();
  for (const q of bolsarQuotes) quoteMap.set(q.ticker, q.lastPrice);
  for (const q of iolQuotes) quoteMap.set(q.ticker, q.lastPrice);

  // Match and update bonds in DB
  const bonds = await prisma.bond.findMany();
  const matched: { ticker: string; price: number | null; updated: boolean }[] = [];

  for (const bond of bonds) {
    const price = quoteMap.get(bond.ticker);
    if (price !== undefined) {
      await prisma.bond.update({
        where: { id: bond.id },
        data: { lastPrice: price, lastPriceDate: new Date() },
      });
      matched.push({ ticker: bond.ticker, price, updated: true });
    } else {
      matched.push({ ticker: bond.ticker, price: bond.lastPrice, updated: false });
    }
  }

  return NextResponse.json({
    totalScraped: quoteMap.size,
    matchedBonds: matched.filter((m) => m.updated).length,
    quotes: matched,
    sources: ["iol.invertironline.com", "bolsar.info"],
  });
}
