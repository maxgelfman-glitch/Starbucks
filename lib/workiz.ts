const API_TOKEN = process.env.WORKIZ_API_TOKEN || '';
const API_SECRET = process.env.WORKIZ_API_SECRET || '';

// All requests use api.workiz.com
const GET_BASE = 'https://api.workiz.com/api/v1';
const POST_BASE = 'https://api.workiz.com/api/v1';

async function workizGet(endpoint: string) {
  const url = `${GET_BASE}/${API_TOKEN}/${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function workizPost(endpoint: string, data: Record<string, unknown>) {
  const url = `${POST_BASE}/${API_TOKEN}/${endpoint}`;
  // Try multiple secret field name variants — Workiz docs are inconsistent
  const body = {
    auth_secret: API_SECRET,
    api_secret: API_SECRET,
    secret: API_SECRET,
    ...data,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Secret': API_SECRET,
      'Authorization': `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function testConnection() {
  return workizGet('job/all/?offset=0');
}

export async function createJob(data: {
  JobDateTime?: string;
  Phone?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  PostalCode?: string;
  JobType?: string;
  JobDescription?: string;
  JobNotes?: string;
}) {
  return workizPost('job/create/', data);
}

export async function getJob(jobId: string) {
  return workizGet(`job/get/${jobId}/`);
}

export async function getAllJobs(offset = 0) {
  return workizGet(`job/all/?offset=${offset}`);
}

export async function updateJob(jobId: string, data: Record<string, unknown>) {
  return workizPost(`job/update/`, { UUID: jobId, ...data });
}

export async function assignTech(jobId: string, teamMemberId: string) {
  return workizPost(`job/assign/`, { UUID: jobId, UserId: teamMemberId });
}

export async function getTeamMembers() {
  return workizGet('team/all/');
}

export async function createInvoice(data: {
  JobUUID: string;
  Items?: Array<{ description: string; quantity: number; price: number }>;
  [key: string]: unknown;
}) {
  return workizPost('invoice/create/', data);
}
