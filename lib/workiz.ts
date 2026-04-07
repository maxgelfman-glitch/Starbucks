const BASE_URL = process.env.WORKIZ_BASE_URL || 'https://api.workiz.com/api/v1';
const API_TOKEN = process.env.WORKIZ_API_TOKEN || '';

async function workizFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}/${API_TOKEN}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
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
  return workizFetch('job/all/');
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
  return workizFetch(`job/get/${jobId}/`);
}

export async function getAllJobs(page = 1) {
  return workizFetch(`job/all/?page=${page}`);
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
  return workizFetch('tm/all/');
}
