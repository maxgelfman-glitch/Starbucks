'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Job } from '@/lib/types';
import { TECHNICIANS, DEFAULT_PRICE } from '@/lib/constants';

interface CCProject {
  id: string;
  name: string;
}

interface CCPhoto {
  id: string;
  urls?: { original?: string; thumbnail?: string };
  uris?: Array<{ type: string; uri: string }>;
  uri?: string;
  photo_url?: string;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // CompanyCam state
  const [ccProjects, setCcProjects] = useState<CCProject[]>([]);
  const [ccPhotos, setCcPhotos] = useState<CCPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [ccSearching, setCcSearching] = useState(false);
  const [ccLoadingPhotos, setCcLoadingPhotos] = useState(false);
  const [ccError, setCcError] = useState('');

  // Email state
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [sendingPhotos, setSendingPhotos] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));

    fetch('/api/email')
      .then((r) => r.json())
      .then((d) => setEmailConfigured(d.configured))
      .catch(() => {});
  }, [id]);

  async function updateField(field: string, value: string | number) {
    if (!job) return;
    const updated = { ...job, [field]: value, updatedAt: new Date().toISOString() };
    setJob(updated);
    await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function updateStatus(status: Job['status']) {
    await updateField('status', status);
  }

  async function generateDoc(type: 'invoice' | 'work-order' | 'both') {
    if (!job) return;
    setSaving(true);
    try {
      const { generateInvoicePDF } = await import('@/lib/pdf/invoice');
      const { generateWorkOrderPDF } = await import('@/lib/pdf/work-order');

      if (type === 'invoice' || type === 'both') {
        const inv = generateInvoicePDF({
          storeNumber: job.storeNumber, woNumber: job.woNumber || '',
          invoiceNumber: job.invoiceNumber || '', price: job.price || DEFAULT_PRICE,
          serviceDate: job.serviceDate, address: job.address,
          city: job.city, state: job.state, zip: job.zip || '',
        });
        inv.save(`Invoice_${job.storeNumber}.pdf`);
      }
      if (type === 'work-order' || type === 'both') {
        const wo = generateWorkOrderPDF({
          storeNumber: job.storeNumber, woNumber: job.woNumber || '',
          address: job.address, city: job.city, state: job.state,
          zip: job.zip || '', storePhone: job.storePhone || '',
          serviceDate: job.serviceDate, technician: job.assignedTech || '',
          startTime: job.startTime || '', stopTime: job.stopTime || '',
        });
        wo.save(`WO_${job.storeNumber}.pdf`);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  // ── CompanyCam ──

  const [ccMatchedProject, setCcMatchedProject] = useState<string>('');

  async function searchCompanyCam() {
    if (!job) return;
    setCcSearching(true);
    setCcError('');
    setCcPhotos([]);
    setCcProjects([]);
    setSelectedPhotos(new Set());
    setCcMatchedProject('');

    try {
      // Smart search: uses exact naming convention "Starbucks #00806 WO# 1963606"
      const params = new URLSearchParams({ storeNumber: job.storeNumber });
      if (job.woNumber) params.set('woNumber', job.woNumber);

      const res = await fetch(`/api/companycam?${params}`);
      const data = await res.json();

      if (!data.success) {
        setCcError(data.error || 'Search failed.');
        setCcSearching(false);
        return;
      }

      if (data.matched && data.project) {
        // Exact match found — photos already loaded
        setCcMatchedProject(data.project.name);
        setCcPhotos(data.photos || []);
        // Auto-select all photos (typically exactly 5)
        const allUrls = (data.photos || []).map((p: CCPhoto) => getPhotoUrl(p)).filter(Boolean);
        setSelectedPhotos(new Set(allUrls));
      } else {
        // No exact match — show search results for manual selection
        setCcProjects(data.searchResults || []);
        if ((data.searchResults || []).length === 0) {
          setCcError(`No CompanyCam projects found for Starbucks #${job.storeNumber}.`);
        } else {
          setCcError(data.message || 'No exact match. Select a project below.');
        }
      }
    } catch {
      setCcError('Failed to connect to CompanyCam.');
    }
    setCcSearching(false);
  }

  async function loadPhotos(projectId: string, projectName?: string) {
    setCcLoadingPhotos(true);
    setCcError('');
    try {
      const res = await fetch(`/api/companycam?projectId=${projectId}`);
      const data = await res.json();
      if (data.success && data.photos) {
        setCcPhotos(data.photos);
        setCcProjects([]);
        setCcMatchedProject(projectName || '');
        // Auto-select all photos
        const allUrls = data.photos.map((p: CCPhoto) => getPhotoUrl(p)).filter(Boolean);
        setSelectedPhotos(new Set(allUrls));
      }
    } catch {
      setCcError('Failed to load photos.');
    }
    setCcLoadingPhotos(false);
  }

  function getPhotoUrl(photo: CCPhoto): string {
    if (photo.urls?.original) return photo.urls.original;
    if (photo.uris?.length) {
      const original = photo.uris.find((u) => u.type === 'original');
      if (original) return original.uri;
      return photo.uris[0].uri;
    }
    return photo.uri || photo.photo_url || '';
  }

  function getThumbUrl(photo: CCPhoto): string {
    if (photo.urls?.thumbnail) return photo.urls.thumbnail;
    return getPhotoUrl(photo);
  }

  function togglePhoto(url: string) {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  // ── Email sending ──

  async function sendDocumentsEmail() {
    if (!job) return;
    setSendingDocs(true);
    setEmailStatus('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'documents',
          storeNumber: job.storeNumber,
          woNumber: job.woNumber || '',
          invoiceData: {
            invoiceNumber: job.invoiceNumber || '',
            price: job.price || DEFAULT_PRICE,
            serviceDate: job.serviceDate,
            address: job.address,
            city: job.city,
            state: job.state,
            zip: job.zip || '',
          },
          workOrderData: {
            address: job.address,
            city: job.city,
            state: job.state,
            zip: job.zip || '',
            storePhone: job.storePhone || '',
            serviceDate: job.serviceDate,
            technician: job.assignedTech || '',
            startTime: job.startTime || '',
            stopTime: job.stopTime || '',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('Documents sent to documents@gosuperclean.com');
      } else {
        setEmailStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      setEmailStatus('Failed to send documents email.');
      console.error(err);
    }
    setSendingDocs(false);
  }

  async function sendPhotosEmail() {
    if (!job || selectedPhotos.size === 0) return;
    setSendingPhotos(true);
    setEmailStatus('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photos',
          storeNumber: job.storeNumber,
          woNumber: job.woNumber || '',
          photoUrls: Array.from(selectedPhotos),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('Photos sent to starbucks@gosuperclean.com');
      } else {
        setEmailStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      setEmailStatus('Failed to send photos email.');
      console.error(err);
    }
    setSendingPhotos(false);
  }

  if (loading) return <p className="text-gray-500 text-center py-20">Loading...</p>;
  if (!job) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Job not found</p>
      <button onClick={() => router.push('/schedule')} className="text-[#00A4C7] hover:underline">Back to Schedule</button>
    </div>
  );

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    'in-progress': 'bg-yellow-500',
    completed: 'bg-green-500',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-2 block">&larr; Back</button>
          <h1 className="text-2xl font-bold text-white">Starbucks #{job.storeNumber}</h1>
          <p className="text-gray-400 text-sm">{job.address}, {job.city}, {job.state} {job.zip}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[job.status]}`} />
      </div>

      {/* Job Details */}
      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Status</label>
          <div className="flex gap-2">
            {(['scheduled', 'in-progress', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  job.status === s
                    ? 'bg-[#00A4C7] text-white'
                    : 'bg-[#0a0f1a] text-gray-400 border border-[#374151] hover:border-[#00A4C7]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditField label="WO #" value={job.woNumber || ''} onSave={(v) => updateField('woNumber', v)} />
          <EditField label="Invoice #" value={job.invoiceNumber || ''} onSave={(v) => updateField('invoiceNumber', v)} />
          <div>
            <label className="block text-sm text-gray-400 mb-1">Assigned Tech</label>
            <select
              value={job.assignedTech || ''}
              onChange={(e) => updateField('assignedTech', e.target.value)}
              className="w-full bg-[#0a0f1a] border border-[#374151] rounded px-3 py-2 text-sm text-gray-100"
            >
              <option value="">Unassigned</option>
              {TECHNICIANS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <EditField label="Price" value={String(job.price || DEFAULT_PRICE)} type="number" onSave={(v) => updateField('price', Number(v))} />
          <EditField label="Service Date" value={job.serviceDate} type="date" onSave={(v) => updateField('serviceDate', v)} />
          <EditField label="Night #" value={String(job.nightNumber || '')} type="number" onSave={(v) => updateField('nightNumber', Number(v))} />
          <EditField label="Start Time" value={job.startTime || ''} type="time" onSave={(v) => updateField('startTime', v)} />
          <EditField label="Stop Time" value={job.stopTime || ''} type="time" onSave={(v) => updateField('stopTime', v)} />
          <EditField label="Zip" value={job.zip || ''} onSave={(v) => updateField('zip', v)} />
          <EditField label="Store Phone" value={job.storePhone || ''} onSave={(v) => updateField('storePhone', v)} />
        </div>
      </div>

      {/* Documents */}
      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => generateDoc('invoice')} disabled={saving}
            className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50">
            Generate Invoice PDF
          </button>
          <button onClick={() => generateDoc('work-order')} disabled={saving}
            className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50">
            Generate Work Order PDF
          </button>
          <button onClick={() => generateDoc('both')} disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
            Download Both
          </button>
        </div>
      </div>

      {/* CompanyCam Photos */}
      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">CompanyCam Photos</h2>
            {ccMatchedProject && (
              <p className="text-green-400 text-xs mt-1">Matched: {ccMatchedProject}</p>
            )}
          </div>
          <button
            onClick={searchCompanyCam}
            disabled={ccSearching}
            className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50"
          >
            {ccSearching ? 'Searching...' : ccPhotos.length > 0 ? 'Refresh' : 'Find Photos'}
          </button>
        </div>

        {!ccSearching && ccPhotos.length === 0 && ccProjects.length === 0 && !ccError && (
          <p className="text-gray-500 text-sm mb-3">
            Click &quot;Find Photos&quot; to search for project &quot;Starbucks #{job.storeNumber}{job.woNumber ? ` WO# ${job.woNumber}` : ''}&quot;
          </p>
        )}

        {ccError && <p className="text-yellow-400 text-sm mb-3">{ccError}</p>}

        {/* Fallback: manual project selection when no exact match */}
        {ccProjects.length > 0 && ccPhotos.length === 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-gray-400 text-sm">Select the correct project:</p>
            {ccProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPhotos(p.id, p.name)}
                disabled={ccLoadingPhotos}
                className="block w-full text-left p-3 bg-[#0a0f1a] border border-[#374151] rounded hover:border-[#00A4C7] transition-colors"
              >
                <span className="text-white text-sm font-medium">{p.name}</span>
                <span className="text-gray-500 text-xs ml-2">Click to load photos</span>
              </button>
            ))}
          </div>
        )}

        {ccLoadingPhotos && <p className="text-gray-500 text-sm">Loading photos...</p>}

        {/* Photo grid */}
        {ccPhotos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm">
                {ccPhotos.length} photo(s) — {selectedPhotos.size} selected
                {selectedPhotos.size === ccPhotos.length && ccPhotos.length > 0 && (
                  <span className="text-green-400 ml-1">(all selected)</span>
                )}
              </p>
              <button
                onClick={() => {
                  if (selectedPhotos.size === ccPhotos.length) {
                    setSelectedPhotos(new Set());
                  } else {
                    setSelectedPhotos(new Set(ccPhotos.map((p) => getPhotoUrl(p)).filter(Boolean)));
                  }
                }}
                className="text-[#00A4C7] text-xs hover:underline"
              >
                {selectedPhotos.size === ccPhotos.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {ccPhotos.map((photo) => {
                const url = getPhotoUrl(photo);
                const thumb = getThumbUrl(photo);
                const selected = selectedPhotos.has(url);
                return (
                  <button
                    key={photo.id}
                    onClick={() => togglePhoto(url)}
                    className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                      selected ? 'border-[#00A4C7]' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={`Photo ${photo.id}`}
                      className="w-full h-full object-cover"
                    />
                    {selected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-[#00A4C7] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        &#10003;
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Email Sending */}
      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Send Emails</h2>

        {!emailConfigured && (
          <p className="text-yellow-400 text-sm mb-4">
            Email not configured. Set RESEND_API_KEY in .env.local
          </p>
        )}

        <div className="space-y-4">
          {/* Documents email */}
          <div className="p-4 bg-[#0a0f1a] rounded border border-[#1f2937]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Invoice + Work Order</p>
                <p className="text-gray-500 text-xs">To: documents@gosuperclean.com</p>
                <p className="text-gray-500 text-xs">Attachments: Invoice PDF, Signed Work Order PDF</p>
              </div>
              <button
                onClick={sendDocumentsEmail}
                disabled={sendingDocs || !emailConfigured || !job.woNumber}
                className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50"
              >
                {sendingDocs ? 'Sending...' : 'Send Documents'}
              </button>
            </div>
            {!job.woNumber && (
              <p className="text-yellow-500 text-xs mt-2">WO # required before sending</p>
            )}
          </div>

          {/* Photos email */}
          <div className="p-4 bg-[#0a0f1a] rounded border border-[#1f2937]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Service Photos ({selectedPhotos.size} selected)</p>
                <p className="text-gray-500 text-xs">To: starbucks@gosuperclean.com</p>
                <p className="text-gray-500 text-xs">Attachments: {selectedPhotos.size} photo(s) from CompanyCam</p>
              </div>
              <button
                onClick={sendPhotosEmail}
                disabled={sendingPhotos || !emailConfigured || selectedPhotos.size === 0}
                className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50"
              >
                {sendingPhotos ? 'Sending...' : 'Send Photos'}
              </button>
            </div>
            {selectedPhotos.size === 0 && (
              <p className="text-yellow-500 text-xs mt-2">Select photos from CompanyCam above first</p>
            )}
          </div>
        </div>

        {emailStatus && (
          <div className={`mt-4 p-3 rounded text-sm ${
            emailStatus.startsWith('Failed')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'
          }`}>
            {emailStatus}
          </div>
        )}
      </div>

      {/* Workiz sync info */}
      {job.workizJobId && (
        <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-4 text-sm text-gray-400">
          Workiz Job ID: <span className="text-white font-mono">{job.workizJobId}</span>
        </div>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  type = 'text',
  onSave,
}: {
  label: string;
  value: string;
  type?: string;
  onSave: (v: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  const [editing, setEditing] = useState(false);

  const displayVal = editing ? localVal : value;

  function handleBlur() {
    setEditing(false);
    if (localVal !== value) {
      onSave(localVal);
    }
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={displayVal}
        onFocus={() => { setEditing(true); setLocalVal(value); }}
        onChange={(e) => { setLocalVal(e.target.value); }}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
        className="w-full bg-[#0a0f1a] border border-[#374151] rounded px-3 py-2 text-sm text-gray-100 focus:border-[#00A4C7] focus:outline-none"
      />
    </div>
  );
}
