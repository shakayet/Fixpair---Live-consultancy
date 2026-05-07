import { Schema, model } from 'mongoose';
import { ITransaction, IInvoice } from './payment.interface';

const transactionSchema = new Schema<ITransaction>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['stripe', 'paypal'], required: true },
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: [
        'pending',
        'authorized',
        'captured',
        'failed',
        'refunded',
        'voided',
      ],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['authorization', 'capture', 'charge'],
      required: true,
    },
    retryCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

transactionSchema.index({ consultation: 1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });

export const Transaction = model<ITransaction>(
  'Transaction',
  transactionSchema,
);

const invoiceSchema = new Schema<IInvoice>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, required: true },
    duration: { type: Number, required: true },
    perMinuteRate: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: {
      type: String,
      enum: ['paid', 'unpaid', 'failed'],
      default: 'unpaid',
    },
    pdfUrl: { type: String },
  },
  { timestamps: true },
);

invoiceSchema.index({ session: 1 });
invoiceSchema.index({ user: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
