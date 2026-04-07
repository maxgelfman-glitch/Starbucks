import { NextRequest, NextResponse } from 'next/server';
import { searchProjects, findStarbucksProject, getProjectPhotos } from '@/lib/companycam';

/**
 * GET /api/companycam?storeNumber=00806&woNumber=1963606 — find exact project + photos
 * GET /api/companycam?query=00806 — generic search
 * GET /api/companycam?projectId=123 — get photos for a specific project
 */
export async function GET(req: NextRequest) {
  try {
    const storeNumber = req.nextUrl.searchParams.get('storeNumber');
    const woNumber = req.nextUrl.searchParams.get('woNumber');
    const query = req.nextUrl.searchParams.get('query');
    const projectId = req.nextUrl.searchParams.get('projectId');

    // Direct photo fetch by project ID
    if (projectId) {
      const photos = await getProjectPhotos(projectId);
      return NextResponse.json({ success: true, photos });
    }

    // Smart Starbucks project finder — uses exact naming convention
    // "Starbucks #00806 WO# 1963606"
    if (storeNumber) {
      const project = await findStarbucksProject(storeNumber, woNumber || undefined);

      if (!project) {
        // Return all search results so user can pick manually
        const fallbackResults = await searchProjects(`Starbucks #${storeNumber}`);
        return NextResponse.json({
          success: true,
          matched: false,
          project: null,
          photos: [],
          searchResults: fallbackResults,
          message: `No exact match for Starbucks #${storeNumber}${woNumber ? ` WO# ${woNumber}` : ''}. ${fallbackResults.length} similar project(s) found.`,
        });
      }

      // Found exact match — auto-load photos
      const photos = await getProjectPhotos(project.id);
      return NextResponse.json({
        success: true,
        matched: true,
        project: { id: project.id, name: project.name },
        photos,
        message: `Found "${project.name}" with ${photos.length} photo(s).`,
      });
    }

    // Generic search fallback
    if (query) {
      const projects = await searchProjects(query);
      return NextResponse.json({ success: true, projects });
    }

    return NextResponse.json(
      { error: 'Provide ?storeNumber= (and optionally &woNumber=), ?query=, or ?projectId=' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
