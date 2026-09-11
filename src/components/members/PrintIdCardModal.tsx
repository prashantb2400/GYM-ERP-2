'use client';

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils/format';

interface PrintIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymName?: string;
  member: {
    id: string;
    name: string;
    member_code: string;
    photo_url?: string | null;
    phone?: string;
    blood_group?: string | null;
    plan_name?: string;
    plan_start_date?: string | null;
    plan_end_date?: string | null;
    branch_name?: string;
    emergency_contact?: { name?: string; phone?: string; relation?: string } | null;
    qr_token?: string;
    status?: string;
    admission_date?: string | null;
  };
}

export function PrintIdCardModal({ isOpen, onClose, gymName, member }: PrintIdCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const qrValue = `gymerp://checkin/${member.qr_token || member.id || member.member_code}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) return;

    const gymTitle = gymName || 'GYM PASS';
    const photoHtml = member.photo_url
      ? `<img src="${member.photo_url}" alt="${member.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #7c3aed;" />`
      : `<div style="width: 80px; height: 80px; border-radius: 50%; background: #7c3aed; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold;">${member.name.charAt(0).toUpperCase()}</div>`;

    // Extract SVG from DOM for print
    const svgElem = cardRef.current?.querySelector('svg');
    const svgHtml = svgElem ? svgElem.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member ID Card - ${member.name} (${member.member_code})</title>
          <style>
            @page {
              size: 86mm 54mm portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 12px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #f4f4f5;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .id-card {
              width: 320px;
              background: #ffffff;
              border: 1px solid #e4e4e7;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header-banner {
              background: linear-gradient(135deg, #6d28d9, #4c1d95);
              color: white;
              padding: 14px 12px;
              text-align: center;
            }
            .header-banner h1 {
              margin: 0;
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .header-banner p {
              margin: 2px 0 0 0;
              font-size: 10px;
              opacity: 0.9;
            }
            .card-body {
              padding: 16px;
              text-align: center;
            }
            .photo-wrap {
              display: flex;
              justify-content: center;
              margin-top: -35px;
              margin-bottom: 8px;
            }
            .member-name {
              font-size: 18px;
              font-weight: 800;
              color: #18181b;
              margin: 0;
            }
            .member-code {
              display: inline-block;
              background: #f4f4f5;
              color: #52525b;
              font-family: monospace;
              font-weight: 700;
              font-size: 12px;
              padding: 3px 10px;
              border-radius: 6px;
              margin-top: 4px;
              border: 1px solid #e4e4e7;
            }
            .details-grid {
              margin-top: 12px;
              padding-top: 10px;
              border-top: 1px dashed #e4e4e7;
              font-size: 11px;
              color: #3f3f46;
              text-align: left;
              line-height: 1.6;
            }
            .details-grid .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .details-grid .label {
              color: #71717a;
            }
            .details-grid .value {
              font-weight: 600;
            }
            .qr-wrap {
              margin-top: 14px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 10px;
              background: #fafafa;
              border-radius: 12px;
              border: 1px solid #f4f4f5;
            }
            .qr-wrap svg {
              width: 120px;
              height: 120px;
            }
            .qr-caption {
              font-size: 9px;
              color: #a1a1aa;
              margin-top: 6px;
              font-weight: 500;
            }
            .footer-strip {
              background: #f4f4f5;
              padding: 8px;
              text-align: center;
              font-size: 9px;
              color: #71717a;
              border-top: 1px solid #e4e4e7;
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header-banner">
              <h1>${gymTitle}</h1>
              <p>${member.branch_name ? `${member.branch_name} Branch • ` : ''}Official Member Pass</p>
            </div>
            <div class="card-body">
              <div class="photo-wrap">
                ${photoHtml}
              </div>
              <h2 class="member-name">${member.name}</h2>
              <span class="member-code">${member.member_code}</span>
              
              <div class="details-grid">
                <div class="row">
                  <span class="label">Plan:</span>
                  <span class="value">${member.plan_name || 'Standard Membership'}</span>
                </div>
                ${member.plan_end_date ? `
                <div class="row">
                  <span class="label">Valid Until:</span>
                  <span class="value">${formatDate(member.plan_end_date)}</span>
                </div>` : ''}
                ${member.phone ? `
                <div class="row">
                  <span class="label">Phone:</span>
                  <span class="value">${member.phone}</span>
                </div>` : ''}
                ${member.blood_group ? `
                <div class="row">
                  <span class="label">Blood Group:</span>
                  <span class="value">${member.blood_group}</span>
                </div>` : ''}
                ${member.emergency_contact?.phone ? `
                <div class="row">
                  <span class="label">Emergency:</span>
                  <span class="value">${member.emergency_contact.phone} (${member.emergency_contact.name || 'Contact'})</span>
                </div>` : ''}
              </div>

              <div class="qr-wrap">
                ${svgHtml}
                <span class="qr-caption">Scan at entry turnstile / reception</span>
              </div>
            </div>
            <div class="footer-strip">
              Non-transferable • Report lost cards to front desk
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Printer className="h-5 w-5 text-purple-400" />
            Member ID Card & QR Pass
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Printable physical badge with high-resolution vector QR code for turnstiles and kiosks.
          </DialogDescription>
        </DialogHeader>

        {/* Card Preview */}
        <div className="flex justify-center my-4">
          <div
            ref={cardRef}
            className="w-[300px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl relative text-zinc-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-4 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200">
                {gymName || 'GymERP Member Pass'}
              </p>
              <p className="text-xs font-semibold text-white mt-0.5">
                {member.branch_name ? `${member.branch_name} Branch` : 'Main Branch'}
              </p>
            </div>

            {/* Photo & Identity */}
            <div className="p-4 flex flex-col items-center text-center">
              <div className="relative -mt-9 mb-2">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover border-3 border-purple-500 shadow-md bg-zinc-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xl border-3 border-purple-500 shadow-md">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-zinc-100 leading-tight">{member.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-semibold bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800 text-zinc-300">
                  {member.member_code}
                </span>
                <Badge
                  className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 ${
                    member.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {member.status || 'Active'}
                </Badge>
              </div>

              {/* Quick Details */}
              <div className="w-full mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-300 space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Plan</span>
                  <span className="font-medium text-zinc-200 truncate max-w-[170px]">
                    {member.plan_name || 'Standard'}
                  </span>
                </div>
                {member.plan_end_date && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Valid Until</span>
                    <span className="font-medium text-purple-300">{formatDate(member.plan_end_date)}</span>
                  </div>
                )}
                {member.blood_group && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Blood Group</span>
                    <span className="font-medium text-red-400">{member.blood_group}</span>
                  </div>
                )}
              </div>

              {/* Scannable QR Code */}
              <div className="mt-3.5 bg-white p-3 rounded-xl shadow-inner flex flex-col items-center">
                <QRCodeSVG
                  value={qrValue}
                  size={120}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#09090b"
                />
                <span className="text-[9px] text-zinc-600 font-medium mt-1 font-mono">
                  {member.member_code}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-950 px-3 py-2 text-center text-[9px] text-zinc-500 border-t border-zinc-800/60 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3 text-purple-400" />
              <span>Official Access Pass • Scan to verify</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-zinc-900">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400">
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-2 font-semibold"
          >
            <Printer className="h-4 w-4" />
            Print ID Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
