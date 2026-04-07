import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { downloadPhotoAsBase64 } from '@/lib/companycam';
import { generateInvoicePDF } from '@/lib/pdf/invoice';
import { generateWorkOrderPDF } from '@/lib/pdf/work-order';

interface SendRequest {
  type: 'documents' | 'photos';
  storeNumber: string;
  woNumber: string;
  // For documents email
  invoiceData?: {
    invoiceNumber: string;
    price: number;
    serviceDate: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  workOrderData?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    storePhone: string;
    serviceDate: string;
    technician: string;
    startTime: string;
    stopTime: string;
  };
  // For photos email
  photoUrls?: string[];
}

export async function POST(req: NextRequest) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Email not configured. Set RESEND_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const body: SendRequest = await req.json();

    if (body.type === 'documents') {
      // Generate PDFs and send to documents@gosuperclean.com
      if (!body.invoiceData || !body.workOrderData) {
        return NextResponse.json({ error: 'invoiceData and workOrderData required' }, { status: 400 });
      }

      const invPdf = generateInvoicePDF({
        storeNumber: body.storeNumber,
        woNumber: body.woNumber,
        ...body.invoiceData,
      });
      const invBase64 = Buffer.from(invPdf.output('arraybuffer')).toString('base64');

      const woPdf = generateWorkOrderPDF({
        storeNumber: body.storeNumber,
        woNumber: body.woNumber,
        ...body.workOrderData,
      });
      const woBase64 = Buffer.from(woPdf.output('arraybuffer')).toString('base64');

      await sendEmail({
        to: 'documents@gosuperclean.com',
        subject: `Starbucks #${body.storeNumber} WO# ${body.woNumber} Invoice`,
        body: `<p>Attached is the invoice and signed WO for Starbucks #${body.storeNumber} WO# ${body.woNumber}. Let me know if you have any questions. Thanks.</p>`,
        attachments: [
          {
            name: `Invoice_SB${body.storeNumber}_WO${body.woNumber}.pdf`,
            contentType: 'application/pdf',
            base64: invBase64,
          },
          {
            name: `WorkOrder_SB${body.storeNumber}_WO${body.woNumber}.pdf`,
            contentType: 'application/pdf',
            base64: woBase64,
          },
        ],
      });

      return NextResponse.json({ success: true, message: 'Documents email sent' });

    } else if (body.type === 'photos') {
      // Download photos and send to starbucks@gosuperclean.com
      if (!body.photoUrls || body.photoUrls.length === 0) {
        return NextResponse.json({ error: 'photoUrls required' }, { status: 400 });
      }

      const attachments = [];
      for (let i = 0; i < body.photoUrls.length; i++) {
        const { base64, contentType } = await downloadPhotoAsBase64(body.photoUrls[i]);
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        attachments.push({
          name: `SB${body.storeNumber}_photo_${i + 1}.${ext}`,
          contentType,
          base64,
        });
      }

      await sendEmail({
        to: 'starbucks@gosuperclean.com',
        subject: `Starbucks #${body.storeNumber} WO# ${body.woNumber} Pictures`,
        body: `<p>Attached are the before/after pictures and front door photo for Starbucks #${body.storeNumber} WO# ${body.woNumber}. Let me know if you have any questions. Thanks.</p>`,
        attachments,
      });

      return NextResponse.json({ success: true, message: 'Photos email sent' });

    } else {
      return NextResponse.json({ error: 'type must be "documents" or "photos"' }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/email — check if email is configured
 */
export async function GET() {
  return NextResponse.json({ configured: isEmailConfigured() });
}
