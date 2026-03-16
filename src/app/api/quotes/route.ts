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

  // Get existing bonds indexed by ticker
  const existingBonds = await prisma.bond.findMany();
  const existingTickers = new Set(existingBonds.map((b) => b.ticker));

  let updated = 0;
  let created = 0;

  // Update existing bonds with new prices
  for (const bond of existingBonds) {
    const price = quoteMap.get(bond.ticker);
    if (price !== undefined) {
      await prisma.bond.update({
        where: { id: bond.id },
        data: { lastPrice: price, lastPriceDate: new Date() },
      });
      updated++;
    }
  }

  // Auto-create new bonds from scraped data (ticker + price only, no terms)
  const newBonds: { ticker: string; price: number }[] = [];
  for (const [ticker, price] of quoteMap) {
    if (!existingTickers.has(ticker)) {
      newBonds.push({ ticker, price });
    }
  }

  if (newBonds.length > 0) {
    await prisma.bond.createMany({
      data: newBonds.map((b) => ({
        ticker: b.ticker,
        issuer: extractIssuer(b.ticker),
        lastPrice: b.price,
        lastPriceDate: new Date(),
        hasTerms: false,
      })),
      skipDuplicates: true,
    });
    created = newBonds.length;
  }

  return NextResponse.json({
    totalScraped: quoteMap.size,
    updated,
    created,
    total: existingBonds.length + created,
    sources: ["iol.invertironline.com", "bolsar.info"],
  });
}

/** Extract a rough issuer name from ticker (e.g. "YPF2026" -> "YPF", "MGCHO" -> "MGC") */
function extractIssuer(ticker: string): string {
  // Remove trailing numbers, common suffixes like D, C, O
  const match = ticker.match(/^([A-Z]{2,6})/);
  return match ? match[1] : ticker;
}
