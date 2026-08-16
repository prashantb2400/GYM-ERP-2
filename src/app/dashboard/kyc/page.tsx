'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  FileCheck,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  User,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function KycPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Preview Image Modal states
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Rejection Dialog states
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingRejection, setSavingRejection] = useState(false);

  const fetchDocuments = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('kyc_documents')
        .select('*, members(name, member_code, phone)')
        .eq('gym_id', user.gymId)
        .order('uploaded_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side search filter for member name / code
      let filtered = data || [];
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(doc => 
          doc.members?.name.toLowerCase().includes(term) ||
          doc.members?.member_code.toLowerCase().includes(term)
        );
      }

      setDocuments(filtered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user?.gymId, statusFilter, search]);

  const handleOpenPreview = (doc: any) => {
    setSelectedDoc(doc);
    setOpenPreviewModal(true);
  };

  const handleApproveKyc = async (doc: any) => {
    if (!can('kyc.verify')) {
      toast.error('You do not have permission to verify KYC documents');
      return;
    }

    try {
      setLoading(true);
      
      // Update kyc_documents table
      const { error: kycError } = await supabase
        .from('kyc_documents')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      if (kycError) throw kycError;

      // Update members table status
      await supabase
        .from('members')
        .update({ kyc_status: 'verified' })
        .eq('id', doc.member_id);

      toast.success(`KYC document verified for ${doc.members?.name}!`);
      
      // Simulate WhatsApp message trigger
      await supabase.from('whatsapp_logs').insert({
        gym_id: user?.gymId,
        member_id: doc.member_id,
        recipient_phone: doc.members?.phone || '919876543210',
        recipient_name: doc.members?.name,
        message_type: 'template',
        template_name: 'kyc_verified',
        status: 'delivered',
      });

      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleOpenRejectModal = (doc: any) => {
    if (!can('kyc.verify')) {
      toast.error('You do not have permission to verify KYC documents');
      return;
    }
    setSelectedDoc(doc);
    setRejectionReason('');
    setOpenRejectModal(true);
  };

  const handleRejectKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setSavingRejection(true);
      
      // Update kyc_documents
      const { error: kycError } = await supabase
        .from('kyc_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', selectedDoc.id);

      if (kycError) throw kycError;

      // Update members table
      await supabase
        .from('members')
        .update({ kyc_status: 'rejected' })
        .eq('id', selectedDoc.member_id);

      toast.success('KYC document rejected');
      
      // Simulate WhatsApp notification trigger
      await supabase.from('whatsapp_logs').insert({
        gym_id: user?.gymId,
        member_id: selectedDoc.member_id,
        recipient_phone: selectedDoc.members?.phone || '919876543210',
        recipient_name: selectedDoc.members?.name,
        message_type: 'template',
        template_name: 'kyc_rejected',
        status: 'delivered',
      });

      setOpenRejectModal(false);
      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSavingRejection(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">KYC Verification</h2>
          <p className="text-zinc-500 text-xs mt-1">Review member identity documents (Aadhaar, PAN, Passport) and approve verification status.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by member code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* KYC Table List */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No KYC documents found matching status.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Code</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Member Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Document Type</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Upload Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-center">Document Preview</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Verification Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-300 text-xs">{doc.members?.member_code}</TableCell>
                  <TableCell className="font-medium text-zinc-200 text-xs">{doc.members?.name}</TableCell>
                  <TableCell className="text-zinc-400 capitalize text-xs">{doc.document_type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{formatDate(doc.uploaded_at)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(doc.status)} border text-[10px] font-semibold rounded px-2 py-0.5 capitalize`}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenPreview(doc)}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        title="Preview Document File"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {can('kyc.verify') && doc.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApproveKyc(doc)}
                          className="h-8 w-8 text-zinc-400 hover:text-green-400"
                          title="Verify / Approve document"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenRejectModal(doc)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                          title="Reject document with comments"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : doc.status === 'rejected' ? (
                      <span className="text-[10px] text-red-400 italic max-w-[150px] truncate block" title={doc.rejection_reason}>
                        Reason: {doc.rejection_reason}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 block py-1.5">Action recorded</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* KYC Preview Dialog Modal */}
      <Dialog open={openPreviewModal} onOpenChange={setOpenPreviewModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">KYC File Preview</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Reviewing Aadhaar / PAN for member: {selectedDoc?.members?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col items-center justify-center bg-zinc-950 p-4 rounded-lg border border-zinc-800 min-h-[300px] relative">
            {selectedDoc?.document_url ? (
              selectedDoc.document_url.endsWith('.pdf') ? (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-purple-400 mx-auto" />
                  <span className="text-xs text-zinc-300 font-semibold block">PDF Document Uploaded</span>
                  <a
                    href={selectedDoc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:underline font-bold"
                  >
                    Open PDF in New Tab <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <img
                  src={selectedDoc.document_url}
                  alt="KYC Document Preview"
                  className="max-h-[350px] w-auto object-contain rounded border border-zinc-800"
                />
              )
            ) : (
              <span className="text-xs text-zinc-500">File loading failed.</span>
            )}
          </div>

          <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
            <Button variant="ghost" onClick={() => setOpenPreviewModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
              Close Preview
            </Button>
            {can('kyc.verify') && selectedDoc?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setOpenPreviewModal(false);
                    handleOpenRejectModal(selectedDoc);
                  }}
                  variant="outline"
                  className="border-red-500/25 text-red-400 hover:bg-red-500/5 text-xs"
                >
                  Reject File
                </Button>
                <Button
                  onClick={() => {
                    setOpenPreviewModal(false);
                    handleApproveKyc(selectedDoc);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
                >
                  Approve / Verify
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Rejection Dialog Modal */}
      <Dialog open={openRejectModal} onOpenChange={setOpenRejectModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reject KYC File</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              State the reason for rejecting member {selectedDoc?.members?.name}'s document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectKyc} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectionNote" className="text-zinc-300 text-xs font-bold">Reason for Rejection *</Label>
              <Input
                id="rejectionNote"
                placeholder="e.g. Blur image / details do not match profile"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenRejectModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingRejection} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-2">
                {savingRejection ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <XCircle className="h-4 w-4" />}
                Confirm Rejection Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
