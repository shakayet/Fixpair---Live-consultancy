/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { IInvoice } from './payment.interface';
import { Invoice } from './payment.model';
import { Consultation } from '../consultation/consultation.model';
import { User } from '../user/user.model';

/**
 * Invoice Service
 * Generates PDF invoices for completed consultations
 */

const generateInvoicePDF = async (invoiceData: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'invoices');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Invoice Header
      doc.fontSize(25).text('INVOICE', { align: 'right' });
      doc
        .fontSize(10)
        .text(`Invoice #: ${invoiceData.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      // Participants
      doc.fontSize(14).text('Bill To:');
      doc.fontSize(10).text(invoiceData.userName);
      doc.text(invoiceData.userEmail);
      doc.moveDown();

      doc.fontSize(14).text('Consultant:');
      doc.fontSize(10).text(invoiceData.consultantName);
      doc.moveDown();

      // Billing Table
      doc.fontSize(14).text('Consultation Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Duration: ${invoiceData.duration} minutes`);
      doc.text(`Rate: $${invoiceData.perMinuteRate}/min`);
      doc.moveDown();

      doc.text(`Subtotal: $${invoiceData.subtotal.toFixed(2)}`);
      doc.text(`Platform Fee: $${invoiceData.platformFee.toFixed(2)}`);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`Total Amount: $${invoiceData.totalAmount.toFixed(2)}`);
      doc.font('Helvetica').fontSize(10);
      doc.moveDown();

      doc.fontSize(10).text(`Payment Method: ${invoiceData.paymentMethod}`);
      doc.text(`Status: ${invoiceData.status.toUpperCase()}`);

      doc.end();

      stream.on('finish', () => resolve(`/invoices/${fileName}`));
      stream.on('error', err => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

const finalizeInvoice = async (consultationId: string) => {
  const consultation =
    await Consultation.findById(consultationId).populate('user consultant');
  if (!consultation) return;

  const duration = Math.ceil(
    (Date.now() - new Date((consultation as any).createdAt).getTime()) / 60000,
  );
  const subtotal = consultation.consumedAmount - consultation.platformFee;

  const invoiceData = {
    session: consultation._id,
    user: consultation.user._id,
    consultant: consultation.consultant._id,
    invoiceNumber: `INV-${Date.now()}`,
    duration,
    perMinuteRate: consultation.perMinuteRate,
    platformFee: consultation.platformFee,
    subtotal,
    totalAmount: consultation.consumedAmount,
    paymentMethod: 'Stripe', // Get from transaction
    status: 'paid' as const,
  };

  const pdfUrl = await generateInvoicePDF({
    ...invoiceData,
    userName: (consultation.user as any).name,
    userEmail: (consultation.user as any).email,
    consultantName: (consultation.consultant as any).name,
  });

  const invoice = await Invoice.create({
    ...invoiceData,
    pdfUrl,
  });

  return invoice;
};

export const InvoiceService = {
  finalizeInvoice,
};
