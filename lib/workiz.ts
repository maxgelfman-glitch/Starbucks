const BASE_URL = process.env.WORKIZ_BASE_URL || 'https://api.workiz.com/api/v1';
const API_TOKEN = process.env.WORKIZ_API_TOKEN || '';
const API_SECRET = process.env.WORKIZ_API_SECRET || '';

async function workizFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}/${API_TOKEN}/${endpoint}`;

  // For POST requests, include the api_secret in the request body
  let body = options.body;
  if (options.method === 'POST' && body) {
    const parsed = JSON.parse(body as string);
    parsed.api_secret = API_SECRET;
    body = JSON.stringify(parsed);
  } else if (options.method === 'POST') {
    body = JSON.stringify({ api_secret: API_SECRET });
  }

  const res = await fetch(url, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function testConnection() {
  // GET requests pass secret as query param
  const url = `${BASE_URL}/${API_TOKEN}/job/all/?api_secret=${API_SECRET}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createJob(data: {
  jobType?: string;
  clientFirstName?: string;
  jobAddress?: string;
  jobCity?: string;
  jobState?: string;
  jobDescription?: string;
  jobNotes?: string;
  jobDateTime?: string;
}) {
  return workizFetch('job/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getJob(jobId: string) {
  const url = `${BASE_URL}/${API_TOKEN}/job/get/${jobId}/?api_secret=${API_SECRET}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getAllJobs(page = 1) {
  const url = `${BASE_URL}/${API_TOKEN}/job/all/?api_secret=${API_SECRET}&page=${page}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function updateJob(jobId: string, data: Record<string, unknown>) {
  return workizFetch(`job/update/${jobId}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function assignTech(jobId: string, teamMemberId: string) {
  return workizFetch(`job/update/${jobId}/`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo: teamMemberId }),
  });
}

export async function getTeamMembers() {
  const url = `${BASE_URL}/${API_TOKEN}/tm/all/?api_secret=${API_SECRET}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Workiz API error ${res.status}: ${text}`);
  }
  return res.json();
}
