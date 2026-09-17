import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing document URL parameter" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Statute-Compliance-Adjudicator/1.0 (GenLayer Intelligent Contract Validator)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Authority server returned HTTP status ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const excerpt = cleanText.slice(0, 3000);

    return NextResponse.json({
      url,
      excerpt,
      length: cleanText.length,
      status: "fetched",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch document excerpt" },
      { status: 500 }
    );
  }
}
