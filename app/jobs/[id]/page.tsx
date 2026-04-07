'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Job } from '@/lib/types';
import { TECHNICIANS, DEFAULT_PRICE } from '@/lib/constants';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
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
          storeNumber: job.storeNumber,
          woNumber: job.woNumber || '',
          invoiceNumber: job.invoiceNumber || '',
          price: job.price || DEFAULT_PRICE,
          serviceDate: job.serviceDate,
          address: job.address,
          city: job.city,
          state: job.state,
          zip: job.zip || '',
        });
        inv.save(`Invoice_${job.storeNumber}.pdf`);
      }
      if (type === 'work-order' || type === 'both') {
        const wo = generateWorkOrderPDF({
          storeNumber: job.storeNumber,
          woNumber: job.woNumber || '',
          address: job.address,
          city: job.city,
          state: job.state,
          zip: job.zip || '',
          storePhone: job.storePhone || '',
          serviceDate: job.serviceDate,
          technician: job.assignedTech || '',
          startTime: job.startTime || '',
          stopTime: job.stopTime || '',
        });
        wo.save(`WO_${job.storeNumber}.pdf`);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-2 block">&larr; Back</button>
          <h1 className="text-2xl font-bold text-white">Starbucks #{job.storeNumber}</h1>
          <p className="text-gray-400 text-sm">{job.address}, {job.city}, {job.state} {job.zip}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[job.status]}`} />
      </div>

      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6 space-y-4">
        {/* Status */}
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

        {/* Editable fields */}
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

      {/* Document generation */}
      <div className="bg-[#111827] rounded-lg border border-[#1f2937] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateDoc('invoice')}
            disabled={saving}
            className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50"
          >
            Generate Invoice PDF
          </button>
          <button
            onClick={() => generateDoc('work-order')}
            disabled={saving}
            className="px-4 py-2 bg-[#00A4C7] text-white rounded text-sm font-medium hover:bg-[#0090b0] transition-colors disabled:opacity-50"
          >
            Generate Work Order PDF
          </button>
          <button
            onClick={() => generateDoc('both')}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Download Both
          </button>
        </div>
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

  // When not actively editing, keep in sync with parent
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
