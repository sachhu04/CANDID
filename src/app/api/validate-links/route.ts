import { NextResponse } from "next/server";
import { startBackgroundValidation, urlCache, isValidSyntax } from "@/lib/url-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const urls: string[] = body.urls || [];
    
    if (!Array.isArray(urls)) {
      return NextResponse.json({ message: "urls must be an array" }, { status: 400 });
    }
    
    const results: Record<string, string> = {};
    
    for (const url of urls) {
      if (!isValidSyntax(url)) {
        results[url] = 'INVALID';
        continue;
      }
      
      // Kick off async validation
      startBackgroundValidation(url);
      
      const cached = urlCache.get(url);
      results[url] = cached ? cached.status : 'PENDING';
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
