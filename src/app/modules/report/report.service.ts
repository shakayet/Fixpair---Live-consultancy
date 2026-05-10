/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Consultation } from '../consultation/consultation.model';
import { User } from '../user/user.model';
import { IReport } from './report.interface';
import { Report } from './report.model';

const generateConsultationPDF = async (reportData: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const fileName = `report-${reportData.consultationId}-${Date.now()}.pdf`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'reports');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Add content to PDF
      doc.fontSize(20).text('Consultation Summary Report', { align: 'center' });
      doc.moveDown();

      doc
        .fontSize(12)
        .text(
          `Date: ${reportData.date ? new Date(reportData.date).toLocaleString() : new Date().toLocaleString()}`,
        );
      doc.text(`Client: ${reportData.userName} (${reportData.userEmail})`);
      doc.text(
        `Consultant: ${reportData.consultantName} (${reportData.consultantEmail})`,
      );
      doc.moveDown();

      doc.fontSize(16).text('Conversation History');
      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .text(reportData.conversation || 'No conversation recorded');
      doc.moveDown();

      if (reportData.notes) {
        doc.moveDown();
        doc.fontSize(16).text('Consultant Notes');
        doc.fontSize(10).text(reportData.notes);
      }

      if (reportData.links && reportData.links.length > 0) {
        doc.moveDown();
        doc.fontSize(16).text('Shared Links');
        reportData.links.forEach((link: string) => {
          doc.fontSize(10).fillColor('blue').text(link, { link: link });
        });
        doc.fillColor('black');
      }

      // Note: Images would require downloading them first if they are URLs,
      // or using local paths if they are stored locally.

      doc.end();

      stream.on('finish', () => {
        resolve(`/reports/${fileName}`);
      });

      stream.on('error', err => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const createReport = async (user: JwtPayload, payload: any, files: any) => {
  const { consultationId, notes, links } = payload;

  const consultation =
    await Consultation.findById(consultationId).populate('user consultant');
  if (!consultation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
  }

  if (consultation.status !== 'completed') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Report can only be generated for completed consultations',
    );
  }

  if (consultation.consultant._id.toString() !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the assigned consultant can finalize the report',
    );
  }

  // Mock conversation capture from external API
  // In a real scenario, you would fetch this from your chat service/database
  const mockConversation = [
    {
      sender: 'user',
      text: 'Hello, I need some advice on my case.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      sender: 'consultant',
      text: 'Sure, I can help with that. Please tell me more.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
    },
    {
      sender: 'user',
      text: 'It is about a contract dispute.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
    },
    {
      sender: 'consultant',
      text: 'I see. I will review the documents and get back to you.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
    },
  ];

  // Format conversation as a single plain text block
  const formattedConversation = mockConversation
    .map(msg => `${msg.sender}: ${msg.text}`)
    .join(' ');

  const images = files?.image
    ? files.image.map((file: any) => `/image/${file.filename}`)
    : [];

  const reportData = {
    consultationId: consultation._id,
    date: consultation.date,
    userName: (consultation.user as any).name,
    userEmail: (consultation.user as any).email,
    consultantName: (consultation.consultant as any).name,
    consultantEmail: (consultation.consultant as any).email,
    conversation: formattedConversation,
    notes,
    links: links ? (typeof links === 'string' ? [links] : links) : [],
    images,
  };

  const pdfUrl = await generateConsultationPDF(reportData);

  const report = await Report.create({
    consultation: consultationId,
    user: consultation.user._id,
    consultant: consultation.consultant._id,
    conversation: formattedConversation,
    notes,
    links: reportData.links,
    images,
    pdfUrl,
  });

  return report;
};

const getReports = async (user: JwtPayload, query: Record<string, unknown>) => {
  const filter: any = {};

  if (user.role === 'USER') {
    filter.user = user.id;
  } else if (user.role === 'CONSULTANT') {
    filter.consultant = user.id;
  }
  // Admin sees all

  const reportQuery = new QueryBuilder(Report.find(filter), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reportQuery.modelQuery.populate([
    { path: 'user', select: 'name email image avatar' },
    { path: 'consultant', select: 'name email image avatar' },
    { path: 'consultation' },
  ]);
  const meta = await reportQuery.getPaginationInfo();

  return { meta, result };
};

const getSingleReport = async (user: JwtPayload, id: string) => {
  const report = await Report.findById(id).populate([
    { path: 'user', select: 'name email image avatar' },
    { path: 'consultant', select: 'name email image avatar' },
    { path: 'consultation' },
  ]);

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found');
  }

  // Access control
  if (user.role === 'USER' && report.user._id.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }
  if (
    user.role === 'CONSULTANT' &&
    report.consultant._id.toString() !== user.id
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  return report;
};

export const ReportService = {
  createReport,
  getReports,
  getSingleReport,
};
