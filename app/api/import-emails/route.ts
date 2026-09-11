import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addJobs } from '@/lib/db';
import { Job } from '@/lib/types';
import { getZipForStore } from '@/lib/zip-lookup';

export const dynamic = 'force-dynamic';

interface ResendEmail {
  id: string;
  subject: string;
  to: string[];
  created_at: string;
  from: string;
}

interface ParsedJob {
  storeNumber: string;
  woNumber: string;
  invoiceNumber?: string;
  serviceDate: string;
  docsSent: boolean;
  photosSent: boolean;
  emails: Array<{ type: 'documents' | 'photos'; sentAt: string; subject: string }>;
}

// Parse "Starbucks #00806 WO# 1963606 Invoice" or "...Pictures" from subject
function parseSubject(subject: string): { storeNumber: string; woNumber: string; type: 'documents' | 'photos' } | null {
  const match = subject.match(/Starbucks\s*#(\d+)\s*WO#?\s*(\d+)\s*(Invoice|Pictures)/i);
  if (!match) return null;
  const [, storeNumber, woNumber, typeStr] = match;
  return {
    storeNumber: storeNumber.padStart(5, '0'),
    woNumber,
    type: typeStr.toLowerCase() === 'invoice' ? 'documents' : 'photos',
  };
}

// Store addresses for the 30 known Starbucks locations
const STORE_INFO: Record<string, { address: string; city: string; state: string }> = {
  '00806': { address: '301 Greenwich Ave', city: 'Greenwich', state: 'CT' },
  '00829': { address: '78 East Putnam Avenue', city: 'Greenwich', state: 'CT' },
  '07230': { address: '815 Post Rd', city: 'Darien', state: 'CT' },
  '00805': { address: '1079 High Ridge Road', city: 'Stamford', state: 'CT' },
  '07366': { address: '2139 Summer St', city: 'Stamford', state: 'CT' },
  '14466': { address: '288 West Avenue', city: 'Stamford', state: 'CT' },
  '67831': { address: '64 High Ridge Rd', city: 'Stamford', state: 'CT' },
  '00813': { address: '51 Purchase St', city: 'Rye', state: 'NY' },
  '08795': { address: '118 S. Ridge Street', city: 'Rye Brook', state: 'NY' },
  '07520': { address: '1030 W Boston Post Rd', city: 'Mamaroneck', state: 'NY' },
  '51382': { address: '726 North Avenue', city: 'New Rochelle', state: 'NY' },
  '29709': { address: '1170 Wilmot Road', city: 'New Rochelle', state: 'NY' },
  '64931': { address: '80 Huguenot St', city: 'New Rochelle', state: 'NY' },
  '80858': { address: '318 Halstead Ave', city: 'Harrison', state: 'NY' },
  '02789': { address: '51 East Parkway', city: 'Scarsdale', state: 'NY' },
  '07303': { address: '684 White Plains Rd', city: 'Scarsdale', state: 'NY' },
  '10464': { address: '1 Depot Sq', city: 'Tuckahoe', state: 'NY' },
  '27437': { address: '46 S Central Ave', city: 'Hartsdale', state: 'NY' },
  '14369': { address: '841-851 Bronx River Rd', city: 'Yonkers', state: 'NY' },
  '51379': { address: '1086 North Broadway', city: 'Yonkers', state: 'NY' },
  '71700': { address: '1969 Central Park Ave', city: 'Yonkers', state: 'NY' },
  '07901': { address: '2458 Central Park Ave', city: 'Yonkers', state: 'NY' },
  '23602': { address: '1 Ridge Hill Blvd', city: 'Yonkers', state: 'NY' },
  '13632': { address: '8000 Mall Walk', city: 'Yonkers', state: 'NY' },
  '11973': { address: '45 Stanley Avenue', city: 'Dobbs Ferry', state: 'NY' },
  '50481': { address: '290 E Main St', city: 'Elmsford', state: 'NY' },
  '11369': { address: '126 West Rockland Plaza', city: 'Nanuet', state: 'NY' },
  '52742': { address: '25 Route 304', city: 'Nanuet', state: 'NY' },
  '14785': { address: '83 South Main', city: 'New City', state: 'NY' },
  '07429': { address: '215 Route 59', city: 'Suffern', state: 'NY' },
};

export async function POST() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
    }

    // Fetch all emails from Resend (paginated)
    const allEmails: ResendEmail[] = [];
    let hasMore = true;
    let cursor: string | undefined = undefined;
    const maxPages = 20;
    let page = 0;

    while (hasMore && page < maxPages) {
      const url: string = cursor
        ? `https://api.resend.com/emails?limit=100&after=${cursor}`
        : `https://api.resend.com/emails?limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Resend API error ${res.status}: ${text}` }, { status: 500 });
      }
      const data = await res.json();
      const emails: ResendEmail[] = data.data || [];
      allEmails.push(...emails);
      hasMore = emails.length === 100;
      cursor = emails.length > 0 ? emails[emails.length - 1].id : undefined;
      page++;
    }

    // Group by storeNumber+woNumber
    const jobMap = new Map<string, ParsedJob>();
    for (const email of allEmails) {
      const parsed = parseSubject(email.subject);
      if (!parsed) continue;
      const key = `${parsed.storeNumber}-${parsed.woNumber}`;
      const existing = jobMap.get(key);
      if (existing) {
        existing.emails.push({ type: parsed.type, sentAt: email.created_at, subject: email.subject });
        if (parsed.type === 'documents') existing.docsSent = true;
        if (parsed.type === 'photos') existing.photosSent = true;
        // Update service date to the earliest email date
        if (email.created_at < existing.serviceDate) {
          existing.serviceDate = email.created_at;
        }
      } else {
        jobMap.set(key, {
          storeNumber: parsed.storeNumber,
          woNumber: parsed.woNumber,
          serviceDate: email.created_at,
          docsSent: parsed.type === 'documents',
          photosSent: parsed.type === 'photos',
          emails: [{ type: parsed.type, sentAt: email.created_at, subject: email.subject }],
        });
      }
    }

    // Convert to Job records
    const now = new Date().toISOString();
    const jobs: Job[] = [];
    const missingStores: string[] = [];

    for (const parsed of jobMap.values()) {
      const info = STORE_INFO[parsed.storeNumber];
      if (!info) {
        missingStores.push(parsed.storeNumber);
      }
      const serviceDateOnly = parsed.serviceDate.split('T')[0];
      jobs.push({
        id: uuidv4(),
        storeNumber: parsed.storeNumber,
        woNumber: parsed.woNumber,
        address: info?.address || '',
        city: info?.city || '',
        state: info?.state || '',
        zip: getZipForStore(parsed.storeNumber),
        price: 350,
        serviceDate: serviceDateOnly,
        status: 'completed',
        emailLogs: parsed.emails.map((e) => ({
          type: e.type,
          to: e.type === 'documents' ? 'documents@gosuperclean.com' : 'starbucks@gosuperclean.com',
          subject: e.subject,
          sentAt: e.sentAt,
          test: false,
        })),
        createdAt: now,
        updatedAt: now,
      });
    }

    // Save all jobs
    if (jobs.length > 0) {
      await addJobs(jobs);
    }

    return NextResponse.json({
      success: true,
      emailsScanned: allEmails.length,
      jobsFound: jobMap.size,
      jobsImported: jobs.length,
      missingStoreInfo: [...new Set(missingStores)],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
