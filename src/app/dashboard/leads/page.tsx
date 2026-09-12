'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientText } from '@/components/magicui/gradient-text';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { QuickAddMember } from '@/components/shared/QuickAddMember';
import { toast } from 'sonner';
import { formatPhone, formatDate } from '@/lib/utils/format';
import { Trash2, UserPlus, Phone, Calendar, ArrowRight, Target, Edit2, Zap, Copy, Check } from 'lucide-react';
import { fetchWithAuth } from '@/lib/utils/api-client';

interface Lead {
  id: string;
  gym_id: string;
  name: string;
  phone: string;
  email?: string;
  interest: 'membership' | 'personal_training' | 'group_class' | 'other';
  source: 'walk_in' | 'referral' | 'instagram' | 'google' | 'other';
  status: 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
  notes?: string;
  follow_up_date?: string;
  created_at: string;
  converted_member_id?: string;
}

export default function LeadsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sqlError, setSqlError] = useState(false);
  
  const [stats, setStats] = useState({ total: 0, hot: 0, converted: 0 });
  
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interest: 'membership',
    source: 'walk_in',
    follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: '',
  });

  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const calculateStats = (data: Lead[]) => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    let hot = 0;
    let conv = 0;
    data?.forEach(l => {
      if (l.status !== 'converted' && l.status !== 'lost' && l.follow_up_date && l.follow_up_date <= today) {
        hot++;
      }
      if (l.status === 'converted' && l.created_at >= startOfMonth) {
        conv++;
      }
    });
    setStats({ total: data?.length || 0, hot, converted: conv });
  };

  const fetchLeads = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setSqlError(false);

      // 1. Primary: Server-side API route
      const res = await fetchWithAuth('/api/leads');
      if (res.ok) {
        const json = await res.json();
        if (json.tableMissing) {
          setSqlError(true);
          setLeads([]);
          setLoading(false);
          return;
        }

        if (json.success && Array.isArray(json.leads)) {
          setLeads(json.leads);
          calculateStats(json.leads);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: Direct Supabase client query
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('follow_up_date', { ascending: true, nullsFirst: false });
        
      if (error) {
        const code = (error as any)?.code;
        const msg = (error as any)?.message || '';
        if (
          code === '42P01' ||
          code === 'PGRST205' ||
          msg.includes('does not exist') ||
          msg.includes('schema cache')
        ) {
          setSqlError(true);
          setLeads([]);
          return;
        }
        toast.error(msg || 'Failed to load leads');
        return;
      }
      
      setLeads(data || []);
      calculateStats(data || []);
    } catch (err: unknown) {
      const msg =
        (err as any)?.message || (err instanceof Error ? err.message : 'Failed to load leads');
      console.warn('fetchLeads warning:', err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user?.gymId]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gymId) return;
    
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone.replace(/\D/g, ''),
        interest: formData.interest,
        source: formData.source,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes,
        branchId: user?.branchId || undefined,
      };

      // 1. Primary: Server API route
      const res = await fetchWithAuth('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Lead added successfully');
        setIsAddSheetOpen(false);
        setFormData({
          name: '',
          phone: '',
          interest: 'membership',
          source: 'walk_in',
          follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          notes: '',
        });
        fetchLeads();
        return;
      }

      // 2. Fallback: Direct insert
      const { error } = await supabase.from('leads').insert([{
        gym_id: user.gymId,
        ...payload,
        status: 'new'
      }]);
      
      if (error) throw error;
      
      toast.success('Lead added successfully');
      setIsAddSheetOpen(false);
      setFormData({
        name: '',
        phone: '',
        interest: 'membership',
        source: 'walk_in',
        follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: '',
      });
      fetchLeads();
    } catch (err: unknown) {
      const msg =
        (err as any)?.message || (err instanceof Error ? err.message : 'Failed to add lead');
      toast.error(msg);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      // 1. Primary: Server API route
      const res = await fetchWithAuth('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        toast.success('Status updated');
        fetchLeads();
        return;
      }

      // 2. Fallback: Direct update
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success('Status updated');
      fetchLeads();
    } catch (err: unknown) {
      const msg =
        (err as any)?.message || (err instanceof Error ? err.message : 'Failed to update status');
      toast.error(msg);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      // 1. Primary: Server API route
      const res = await fetchWithAuth(`/api/leads?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Lead deleted');
        fetchLeads();
        return;
      }

      // 2. Fallback: Direct delete
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err: unknown) {
      const msg =
        (err as any)?.message || (err instanceof Error ? err.message : 'Failed to delete lead');
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'New' };
      case 'contacted': return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Contacted' };
      case 'interested': return { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Interested' };
      case 'converted': return { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Converted' };
      case 'lost': return { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Lost' };
      default: return { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: status };
    }
  };

  const getFollowUpColor = (dateStr?: string, status?: string) => {
    if (!dateStr || status === 'converted' || status === 'lost') return 'text-zinc-500';
    const date = new Date(dateStr).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'text-red-400 font-bold';
    if (date === today) return 'text-amber-400 font-bold';
    return 'text-green-400';
  };

  const getRowBorder = (dateStr?: string, status?: string) => {
    if (!dateStr || status === 'converted' || status === 'lost') return 'border-zinc-800/40';
    const date = new Date(dateStr).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'border-red-900/50 bg-red-950/10';
    if (date === today) return 'border-amber-900/50 bg-amber-950/10';
    return 'border-zinc-800/40';
  };

  return (
    <div className="space-y-6 relative z-0">
      <GridPattern className="absolute inset-0 opacity-20 pointer-events-none -z-10" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            🎯 <GradientText>Leads & Enquiries</GradientText>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage prospective members and follow-ups.</p>
        </div>
        
        <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <UserPlus className="h-4 w-4" /> Add Lead
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-zinc-950 border-zinc-800 text-zinc-100 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-zinc-100">Add New Lead</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleAddLead} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-zinc-900 border-zinc-800 focus:border-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Phone *</label>
                <Input required maxLength={10} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\\D/g, '')})} className="bg-zinc-900 border-zinc-800 focus:border-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Interest</label>
                <Select value={formData.interest} onValueChange={v => setFormData({...formData, interest: v})}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:border-purple-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="personal_training">Personal Training</SelectItem>
                    <SelectItem value="group_class">Group Class</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Source</label>
                <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:border-purple-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Follow-up Date</label>
                <Input type="date" value={formData.follow_up_date} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} className="bg-zinc-900 border-zinc-800 [color-scheme:dark] focus:border-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Notes</label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-zinc-900 border-zinc-800 min-h-[100px] focus:border-purple-600" placeholder="Any specific requirements or discussions..." />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                💾 Save Lead
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {sqlError ? (
        <Card className="border-red-900/50 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-red-400">Database Setup Required</CardTitle>
              <CardDescription className="text-zinc-400">
                Run this migration in your Supabase SQL Editor to enable Leads management with branch isolation and security policies:
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 gap-1.5"
              onClick={() => {
                const sqlText = `CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT DEFAULT 'membership' CHECK (interest IN ('membership', 'personal_training', 'group_class', 'other')),
  source TEXT DEFAULT 'walk_in' CHECK (source IN ('walk_in', 'referral', 'instagram', 'google', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  notes TEXT,
  follow_up_date DATE,
  converted_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_gym_id ON public.leads(gym_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_select ON public.leads FOR SELECT USING (gym_id IN (SELECT gym_id FROM public.users WHERE auth_id = auth.uid()) OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid()));
CREATE POLICY leads_manage ON public.leads FOR ALL USING (gym_id IN (SELECT gym_id FROM public.users WHERE auth_id = auth.uid()) OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid()));`;
                navigator.clipboard.writeText(sqlText);
                setCopiedSql(true);
                toast.success('SQL copied to clipboard!');
                setTimeout(() => setCopiedSql(false), 2000);
              }}
            >
              {copiedSql ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
              {copiedSql ? 'Copied' : 'Copy SQL'}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-950 p-4 rounded-lg text-zinc-300 text-xs font-mono overflow-x-auto border border-zinc-800">
{`CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT DEFAULT 'membership' CHECK (interest IN ('membership', 'personal_training', 'group_class', 'other')),
  source TEXT DEFAULT 'walk_in' CHECK (source IN ('walk_in', 'referral', 'instagram', 'google', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  notes TEXT,
  follow_up_date DATE,
  converted_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_gym_id ON public.leads(gym_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_select ON public.leads FOR SELECT USING (gym_id IN (SELECT gym_id FROM public.users WHERE auth_id = auth.uid()) OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid()));
CREATE POLICY leads_manage ON public.leads FOR ALL USING (gym_id IN (SELECT gym_id FROM public.users WHERE auth_id = auth.uid()) OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid()));`}
            </pre>
            <Button onClick={fetchLeads} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
              🔄 Check Database Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-zinc-800 bg-zinc-900/40 relative overflow-hidden">
              <BorderBeam className="opacity-20" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm font-medium">Total Leads</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{stats.total}</h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-900/30 bg-zinc-900/40 relative overflow-hidden">
              <BorderBeam className="opacity-40" colorFrom="#ef4444" colorTo="#b91c1c" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm font-medium">Hot Leads</p>
                    <p className="text-xs text-zinc-500">Action needed today/overdue</p>
                    <h3 className="text-3xl font-bold text-red-400 mt-1">{stats.hot}</h3>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <Zap className="h-5 w-5 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-zinc-800 bg-zinc-900/40 relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm font-medium">Converted</p>
                    <p className="text-xs text-zinc-500">This month</p>
                    <h3 className="text-3xl font-bold text-green-400 mt-1">{stats.converted}</h3>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <UserPlus className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Interest</TableHead>
                  <TableHead className="text-zinc-400">Source</TableHead>
                  <TableHead className="text-zinc-400">Follow-up</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">Loading leads...</TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No leads found. Add one to get started!</TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className={`border-b \${getRowBorder(lead.follow_up_date, lead.status)} transition-colors`}>
                      <TableCell>
                        <div className="font-medium text-zinc-200">{lead.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {formatPhone(lead.phone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 capitalize bg-zinc-800/50">
                          {lead.interest.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-400 capitalize">{lead.source.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <div className={`text-xs flex items-center gap-1.5 \${getFollowUpColor(lead.follow_up_date, lead.status)}`}>
                          <Calendar className="h-3 w-3" />
                          {lead.follow_up_date ? formatDate(lead.follow_up_date) : 'Not set'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-full">
                              <GlowingBadge variant={lead.status === 'converted' ? 'active' : lead.status === 'lost' ? 'expired' : lead.status === 'interested' ? 'pending' : lead.status === 'contacted' ? 'frozen' : 'frozen'} pulse={lead.status === 'new'}>
                                {getStatusBadge(lead.status).label}
                              </GlowingBadge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-2 bg-zinc-950 border-zinc-800">
                            <div className="flex flex-col gap-1">
                              {['new', 'contacted', 'interested', 'converted', 'lost'].map(s => (
                                <Button
                                  key={s}
                                  variant="ghost"
                                  size="sm"
                                  className={`justify-start capitalize \${lead.status === s ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
                                  onClick={() => updateStatus(lead.id, s)}
                                >
                                  {s}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status !== 'converted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent"
                              onClick={() => setConvertLead(lead)}
                            >
                              Convert <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-red-400"
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {convertLead && (
        <QuickAddMember
          open={!!convertLead}
          onClose={() => setConvertLead(null)}
          onSuccess={async (memberId) => {
            if (memberId && convertLead) {
              await supabase.from('leads').update({ status: 'converted', converted_member_id: memberId }).eq('id', convertLead.id);
              toast.success('Lead converted successfully!');
              fetchLeads();
            }
          }}
          initialData={{ name: convertLead.name, phone: convertLead.phone }}
        />
      )}
    </div>
  );
}
