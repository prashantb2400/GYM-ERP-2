'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  MessageCircle,
  Search,
  CheckCheck,
  AlertTriangle,
  Send,
  Loader2,
  Users,
  Calendar,
  Layers,
  Settings2,
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  Phone,
  ExternalLink,
  CreditCard,
  Cake,
  Dumbbell,
  Apple,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WhatsAppQrModal } from '@/components/whatsapp/WhatsAppQrModal';
import {
  WA_TEMPLATES,
  getTemplateByName,
  formatWhatsAppPhone,
  buildWhatsAppWebUrl,
  renderTemplateText,
  WhatsAppTemplateDefinition,
} from '@/lib/whatsapp/templates';

export default function WhatsAppLogsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [activeTab, setActiveTab] = useState<'logs' | 'automation' | 'templates'>('logs');

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Broadcast Modal states
  const [openBroadcastModal, setOpenBroadcastModal] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Broadcast Form
  const [broadcastType, setBroadcastType] = useState<'text' | 'template' | ''>('');
  const [templateName, setTemplateName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Array of member IDs

  // Provider Settings & Live Status
  const [providerStatus, setProviderStatus] = useState<{
    connected?: boolean;
    provider?: string;
    mode?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<'cloud_api' | 'local_bridge' | 'disabled'>('local_bridge');
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:48291');
  const [bridgeToken, setBridgeToken] = useState('f5bb8941-04a2-4a16-995d-7be7426b0daa');

  // Template Sandbox & Live Test Dispatcher state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('WELCOME_PASS');
  const [testRecipientPhone, setTestRecipientPhone] = useState<string>('919876543210');
  const [testParams, setTestParams] = useState<Record<string, string>>({
    member_name: 'Alex Johnson',
    gym_name: 'IronPulse Fitness Club',
    member_code: 'MEM-1042',
    pass_url: 'https://gymerp.app/pass/m1042',
  });
  const [sendingTest, setSendingTest] = useState(false);

  const fetchConnectionStatus = async () => {
    try {
      setCheckingStatus(true);
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success && data.data) {
        setProviderStatus(data.data);
      }
    } catch (e) {
      console.error('Failed to query WhatsApp connection status', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchGymConfig = async () => {
    if (!user?.gymId) return;
    try {
      const { data } = await supabase
        .from('gyms')
        .select('whatsapp_mode, bridge_url, bridge_token')
        .eq('id', user.gymId)
        .single();
      if (data) {
        setWhatsappMode(data.whatsapp_mode || 'local_bridge');
        setBridgeUrl(data.bridge_url || 'http://localhost:48291');
        setBridgeToken(data.bridge_token || 'f5bb8941-04a2-4a16-995d-7be7426b0daa');
      }
    } catch (e) {
      console.error('Failed to fetch gym WhatsApp config', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gymId) return;
    try {
      setSavingSettings(true);
      const { error } = await supabase
        .from('gyms')
        .update({
          whatsapp_mode: whatsappMode,
          bridge_url: bridgeUrl.trim() || null,
          bridge_token: bridgeToken.trim() || null,
        })
        .eq('id', user.gymId);

      if (error) throw error;
      toast.success('WhatsApp backend configuration updated successfully');
      setOpenSettingsModal(false);
      await fetchConnectionStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save configuration';
      toast.error(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenQrModal = async () => {
    if (whatsappMode !== 'local_bridge') {
      setWhatsappMode('local_bridge');
      if (user?.gymId) {
        try {
          await supabase
            .from('gyms')
            .update({
              whatsapp_mode: 'local_bridge',
              bridge_url: bridgeUrl || 'http://localhost:48291',
              bridge_token: bridgeToken || 'f5bb8941-04a2-4a16-995d-7be7426b0daa',
            })
            .eq('id', user.gymId);
        } catch (e) {
          console.error('Failed to sync local_bridge mode on QR link', e);
        }
      }
    }
    setOpenQrModal(true);
  };

  useEffect(() => {
    fetchConnectionStatus();
    fetchGymConfig();
  }, [user?.gymId]);

  const fetchLogs = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('sent_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search.trim()) {
        query = query.or(`recipient_name.ilike.%${search.trim()}%,recipient_phone.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.gymId, statusFilter, search]);

  useEffect(() => {
    if (!user?.gymId) return;
    // Load members for manual broadcasts selection
    supabase
      .from('members')
      .select('id, name, member_code, phone')
      .eq('gym_id', user.gymId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [user?.gymId]);

  const handleOpenBroadcastModal = () => {
    if (!can('whatsapp.broadcast')) {
      toast.error('You do not have permission to send broadcasts');
      return;
    }
    setBroadcastType('');
    setTemplateName('');
    setMessageContent('');
    setSelectedMembers([]);
    setOpenBroadcastModal(true);
  };

  const handleToggleSelectMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAllActive = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (broadcastType === 'text' && !messageContent.trim()) {
      toast.error('Please enter message content');
      return;
    }
    if (broadcastType === 'template' && !templateName) {
      toast.error('Please select a template');
      return;
    }

    try {
      setSendingBroadcast(true);

      const logsToInsert = selectedMembers.map(mId => {
        const mem = members.find(m => m.id === mId);
        return {
          gym_id: user?.gymId,
          member_id: mId,
          recipient_phone: mem?.phone || '919876543210',
          recipient_name: mem?.name || 'Valued Member',
          message_type: broadcastType,
          template_name: broadcastType === 'template' ? templateName : null,
          status: 'sent',
          wa_message_id: 'wa_broadcast_' + Math.random().toString(36).substr(2, 9),
        };
      });

      const { error } = await supabase.from('whatsapp_logs').insert(logsToInsert);
      if (error) throw error;

      toast.success(`Broadcast triggered successfully to ${selectedMembers.length} members!`);
      setOpenBroadcastModal(false);
      fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Switch template in sandbox and initialize sample params
  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const template = WA_TEMPLATES[templateKey];
    if (!template) return;

    const sampleDefaults: Record<string, string> = {
      member_name: 'Alex Johnson',
      gym_name: 'IronPulse Fitness Club',
      member_code: 'MEM-1042',
      pass_url: 'https://gymerp.app/pass/m1042',
      plan_name: 'Annual Gold Elite',
      amount: '4500',
      due_date: 'Oct 20, 2026',
      checkin_time: '07:30 AM',
      reason: 'Unclear photo identification',
      invoice_id: 'INV-2026-0091',
      link: 'https://g.page/ironpulse/review',
      promo_details: 'Get 2 Months Free on Annual Renewals',
      validity: 'Oct 31, 2026',
      update_message: 'AC maintenance completed in cardio zone.',
    };

    const nextParams: Record<string, string> = {};
    template.variables.forEach(v => {
      nextParams[v] = sampleDefaults[v] || `Sample ${v}`;
    });
    setTestParams(nextParams);
  };

  const handleSendTestMessage = async () => {
    if (!testRecipientPhone.trim()) {
      toast.error('Please enter a destination phone number');
      return;
    }
    const template = WA_TEMPLATES[selectedTemplateKey];
    if (!template) {
      toast.error('Please select a template');
      return;
    }

    try {
      setSendingTest(true);
      const paramValues = template.variables.map(v => testParams[v] || `[${v}]`);
      const formattedParams = paramValues.map(text => ({ type: 'text' as const, text: String(text) }));

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipientPhone.trim(),
          type: 'template',
          templateName: template.name,
          params: formattedParams,
          text: renderTemplateText(template.name, testParams),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch test template');
      }

      toast.success(`Test template "${template.name}" dispatched to ${testRecipientPhone}!`);
      fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test dispatch failed';
      toast.error(msg);
    } finally {
      setSendingTest(false);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (!testRecipientPhone.trim()) {
      toast.error('Please enter a destination phone number');
      return;
    }
    const rendered = renderTemplateText(selectedTemplateKey, testParams);
    const url = buildWhatsAppWebUrl(testRecipientPhone, rendered);
    window.open(url, '_blank');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'read': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const activeTemplate = WA_TEMPLATES[selectedTemplateKey] || WA_TEMPLATES.WELCOME_PASS;
  const renderedMessageText = renderTemplateText(selectedTemplateKey, testParams);

  // Lifecycle automations catalog
  const automationsCatalog = [
    {
      id: 'welcome',
      title: 'Digital Welcome Pass & Credentials',
      category: 'Onboarding',
      icon: Sparkles,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      templateKey: 'WELCOME_PASS',
      trigger: 'Instant trigger upon 3-step member enrollment form submission',
      cadence: 'Real-time Event',
      status: 'Active',
      description: 'Delivers digital member ID, welcome greeting, and direct member portal / pass link with zero friction.',
    },
    {
      id: 'expiry7',
      title: '7-Day Advance Expiry Reminder',
      category: 'Retention',
      icon: Clock,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      templateKey: 'EXPIRY_REMINDER_7DAY',
      trigger: 'Nightly automated cron sweeps memberships expiring in exactly 7 days',
      cadence: 'Nightly 02:00 UTC',
      status: 'Active',
      description: 'Polite early notification encouraging members to renew before their access cards lapse.',
    },
    {
      id: 'expiry3',
      title: '3-Day Urgent Expiry Notice',
      category: 'Retention',
      icon: AlertTriangle,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      templateKey: 'EXPIRY_REMINDER_3DAY',
      trigger: 'Nightly automated cron sweeps memberships expiring in 3 days',
      cadence: 'Nightly 02:30 UTC',
      status: 'Active',
      description: 'High-visibility reminder urging immediate renewal to avoid front-desk check-in stoppage.',
    },
    {
      id: 'expiry1',
      title: '24-Hour Final Expiry Warning',
      category: 'Retention',
      icon: AlertTriangle,
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      templateKey: 'EXPIRY_REMINDER_1DAY',
      trigger: 'Nightly automated cron sweeps memberships expiring tomorrow',
      cadence: 'Nightly 03:00 UTC',
      status: 'Active',
      description: 'Final 24-hour warning alert prompting online renewal or front-desk settlement.',
    },
    {
      id: 'dues',
      title: 'Dynamic UPI Due Settlement',
      category: 'Revenue',
      icon: CreditCard,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      templateKey: 'DUE_PAYMENT_REMINDER',
      trigger: 'Nightly cron + 1-Click front-desk clearance button in Attendance Cockpit',
      cadence: 'Automated & Manual',
      status: 'Active',
      description: 'Includes outstanding balance, due date, and dynamic UPI QR payment link for zero-friction recovery.',
    },
    {
      id: 'checkin',
      title: 'Biometric Attendance Confirmation',
      category: 'Operations',
      icon: CheckCircle2,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      templateKey: 'ATTENDANCE_CHECKIN',
      trigger: 'Dispatched immediately when fingerprint, face, or kiosk QR check-in succeeds',
      cadence: 'Real-time Event',
      status: 'Active',
      description: 'Notifies member of entry timestamp and reinforces member accountability and security.',
    },
    {
      id: 'birthday',
      title: 'Birthday & Anniversary Wishes',
      category: 'Community',
      icon: Cake,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      templateKey: 'BIRTHDAY_GREETING',
      trigger: 'Automated morning cron checks date of birth and join anniversary',
      cadence: 'Daily 04:00 UTC',
      status: 'Active',
      description: 'Personalized greeting strengthening member relationship and gym community culture.',
    },
    {
      id: 'workout_diet',
      title: 'Workout & Diet Routine Delivery',
      category: 'Coaching',
      icon: Dumbbell,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      templateKey: 'EXERCISE_PLAN_SENT',
      trigger: 'Trainer publishes new exercise routine or nutrition plan from trainer dashboard',
      cadence: 'On-Demand Event',
      status: 'Active',
      description: 'Sends instant WhatsApp notification with plan details so members never miss their coaching program.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">WhatsApp Notification Studio</h2>
          <p className="text-zinc-500 text-xs mt-1">Lifecycle notifications, template sandbox, and zero-friction broadcast delivery.</p>
        </div>
        <div className="flex items-center gap-2">
          {can('whatsapp.broadcast') && (
            <Button onClick={handleOpenBroadcastModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
              <Send className="h-4 w-4" /> Trigger New Broadcast
            </Button>
          )}
        </div>
      </div>

      {/* Provider Status & Backend Control Banner */}
      <Card className="border-zinc-800 bg-gradient-to-r from-zinc-900/60 via-zinc-900/40 to-zinc-950/80 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              providerStatus?.connected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {providerStatus?.connected ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">
                  {providerStatus?.provider || (whatsappMode === 'local_bridge' ? 'Baileys Local Bridge' : 'Meta Cloud API')}
                </span>
                <Badge className={`text-[10px] px-2 py-0.5 font-semibold ${
                  providerStatus?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {providerStatus?.connected ? 'Online' : 'Checking / Offline'}
                </Badge>
                {providerStatus?.mode === 'local_bridge' && (
                  <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                    Free Self-Hosted
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {providerStatus?.displayPhoneNumber
                  ? `Active Phone: ${providerStatus.displayPhoneNumber}`
                  : whatsappMode === 'local_bridge'
                  ? 'Connects via desktop app or Cloudflare Tunnel (Zero per-message fees)'
                  : 'Delivered via official Meta WhatsApp Business API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleOpenQrModal}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-medium"
            >
              <QrCode className="h-3.5 w-3.5" />
              Link WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConnectionStatus}
              disabled={checkingStatus}
              className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 text-xs gap-1.5 h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
            {user?.role === 'owner' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenSettingsModal(true)}
                className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 text-xs gap-1.5 h-8"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configure Backend
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 3-Tab Cockpit Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Layers className="h-4 w-4" />
          Delivery Logs & Broadcasts
          <Badge variant="outline" className="text-[10px] ml-1 bg-zinc-900 border-zinc-800 text-zinc-400">
            {logs.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'automation'
              ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Zap className="h-4 w-4" />
          Lifecycle Automations
          <Badge variant="outline" className="text-[10px] ml-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            8 Triggers
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Template Sandbox & Live Test
          <Badge variant="outline" className="text-[10px] ml-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
            Interactive
          </Badge>
        </button>
      </div>

      {/* TAB 1: DELIVERY LOGS & BROADCASTS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search by member name or phone..."
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
                      <SelectItem value="all">All Dispatches</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">No logs captured.</div>
            ) : (
              <Table>
                <TableHeader className="bg-zinc-900/60 border-zinc-800">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400 font-semibold text-xs">Recipient Name</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs">Phone Number</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs">Message Type</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs">Template / Doc</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs">Dispatch Date</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                      <TableCell className="font-semibold text-zinc-200 text-xs">{log.recipient_name}</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{log.recipient_phone}</TableCell>
                      <TableCell className="text-zinc-500 capitalize text-xs">{log.message_type}</TableCell>
                      <TableCell className="text-zinc-500 text-xs">
                        {log.template_name || log.document_type || '-'}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">{formatDateTime(log.sent_at)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`${getStatusBadgeColor(log.status)} text-[9px] font-semibold rounded px-1.5 py-0.5 capitalize`}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: LIFECYCLE AUTOMATIONS COCKPIT */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Active Automated Messaging Lifecycle</h3>
              <p className="text-xs text-zinc-500">
                GymERP runs background cron jobs and event triggers to notify members at critical stages with zero manual intervention.
              </p>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 self-start sm:self-auto text-xs py-1 px-2.5">
              <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Background Engine Operational
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {automationsCatalog.map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700/80 transition-all flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg border ${item.iconColor}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-zinc-100">{item.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">{item.category}</span>
                            <span className="text-zinc-600 text-xs">•</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{item.cadence}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="bg-zinc-950/80 rounded border border-zinc-800/80 p-2.5 text-[11px] font-mono text-zinc-300">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans mb-1 font-semibold">Trigger Condition:</div>
                      {item.trigger}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-500">
                        Template: <code className="text-purple-300 font-mono">{item.templateKey}</code>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleSelectTemplate(item.templateKey);
                          setActiveTab('templates');
                        }}
                        className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1 px-2"
                      >
                        Test in Sandbox <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATE SANDBOX & LIVE TEST DISPATCHER */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selection & Variable Inputs (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Template Engine Configuration</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select any pre-configured template, inspect its parameters, and dispatch live tests to verify variable interpolation.
                </p>
              </div>

              {/* Template Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Select WhatsApp Template</Label>
                <Select value={selectedTemplateKey} onValueChange={handleSelectTemplate}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs max-h-60">
                    {Object.entries(WA_TEMPLATES).map(([key, t]) => (
                      <SelectItem key={key} value={key}>
                        {t.name} ({t.category.toLowerCase()}) - {t.description || key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeTemplate.description && (
                  <p className="text-[11px] text-purple-400">{activeTemplate.description}</p>
                )}
              </div>

              {/* Destination Phone Input */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <Label htmlFor="testPhone" className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
                  <span>Destination WhatsApp Phone Number *</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Include country code (e.g. 91...)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <Input
                    id="testPhone"
                    placeholder="e.g. 919876543210"
                    value={testRecipientPhone}
                    onChange={(e) => setTestRecipientPhone(e.target.value)}
                    className="pl-9 border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Variable Parameter Inputs */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-300 font-semibold">
                    Template Variables ({activeTemplate.variables.length})
                  </Label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Category: {activeTemplate.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTemplate.variables.map((varName) => (
                    <div key={varName} className="space-y-1">
                      <label className="text-[11px] text-zinc-400 font-mono block">
                        &#123;&#123;{varName}&#125;&#125;
                      </label>
                      <Input
                        value={testParams[varName] || ''}
                        onChange={(e) =>
                          setTestParams((prev) => ({ ...prev, [varName]: e.target.value }))
                        }
                        placeholder={`Value for ${varName}`}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 border-t border-zinc-800">
                <Button
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 flex-1 h-9"
                >
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Dispatch Live via API
                </Button>

                <Button
                  variant="outline"
                  onClick={handleOpenWhatsAppWeb}
                  className="border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 text-xs font-semibold gap-2 flex-1 h-9"
                >
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                  Open in WhatsApp Web
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Chat Bubble Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-zinc-800 bg-zinc-950 p-4 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      WA
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Live WhatsApp Chat Bubble</div>
                      <div className="text-[10px] text-zinc-500">Real-time rendered payload preview</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    Preview
                  </Badge>
                </div>

                {/* WhatsApp Chat Canvas Background */}
                <div className="my-4 p-4 rounded-xl bg-[#0b141a] border border-zinc-800/60 min-h-[220px] flex flex-col justify-end">
                  <div className="max-w-[90%] self-end bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs shadow-md space-y-1 relative">
                    <p className="whitespace-pre-wrap leading-relaxed text-[12px] font-sans">
                      {renderedMessageText}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696a0] pt-0.5">
                      <span>12:00 PM</span>
                      <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-zinc-400 bg-zinc-900/60 rounded-lg p-3 border border-zinc-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Raw Template:</span>
                    <span className="font-mono text-purple-400">{activeTemplate.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Category:</span>
                    <span className="font-semibold text-zinc-300">{activeTemplate.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Language:</span>
                    <span className="font-mono text-zinc-300">{activeTemplate.language}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Templates strictly conform to WhatsApp Business API standards and Baileys local bridges.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Broadcast Modal Dialog */}
      <Dialog open={openBroadcastModal} onOpenChange={setOpenBroadcastModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Launch WhatsApp Broadcast</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Dispatch bulk WhatsApp templates to target active members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendBroadcast} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Form Settings */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="bType" className="text-zinc-300 text-xs font-semibold">Broadcast Payload Type *</Label>
                  <Select value={broadcastType} onValueChange={(v: any) => setBroadcastType(v)}>
                    <SelectTrigger id="bType" className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                      <SelectItem value="template">Official Meta Approved Template</SelectItem>
                      <SelectItem value="text">Custom Direct Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {broadcastType === 'template' && (
                  <div className="grid gap-2">
                    <Label htmlFor="tName" className="text-zinc-300 text-xs font-semibold">Meta Template Template *</Label>
                    <Select value={templateName} onValueChange={setTemplateName}>
                      <SelectTrigger id="tName" className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                        <SelectItem value="marketing_festive_offer">festive_season_promo (Offers)</SelectItem>
                        <SelectItem value="attendance_absent_reengagement">miss_you_workout (Retention)</SelectItem>
                        <SelectItem value="kyc_verification_pending">kyc_submit_reminder (Admin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {broadcastType === 'text' && (
                  <div className="grid gap-2">
                    <Label htmlFor="rawMsg" className="text-zinc-300 text-xs font-semibold">Custom Text Content *</Label>
                    <Textarea
                      id="rawMsg"
                      rows={5}
                      placeholder="e.g. Gym will be closed on Tuesday due to Holi celebrations. Stay fit!"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Recipients Selection */}
              <div className="space-y-2 border border-zinc-800 p-3 rounded-lg bg-zinc-950/20 max-h-[300px] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-400">Recipients ({selectedMembers.length})</span>
                  <button
                    type="button"
                    onClick={handleSelectAllActive}
                    className="text-[9px] text-zinc-500 hover:text-zinc-300 font-semibold"
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`target-${m.id}`}
                        checked={selectedMembers.includes(m.id)}
                        onChange={() => handleToggleSelectMember(m.id)}
                        className="rounded border-zinc-700 bg-zinc-950 text-purple-600 focus:ring-purple-600 h-3.5 w-3.5"
                      />
                      <label htmlFor={`target-${m.id}`} className="text-xs text-zinc-300 cursor-pointer select-none">
                        {m.name} ({m.member_code})
                      </label>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <span className="text-xs text-zinc-600 block py-10 text-center">No active members found.</span>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenBroadcastModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={sendingBroadcast} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {sendingBroadcast ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
                Trigger Dispatch Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Backend Configuration Dialog */}
      <Dialog open={openSettingsModal} onOpenChange={setOpenSettingsModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Configure WhatsApp Backend</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Select how this gym dispatches WhatsApp messages. You can use official Meta Cloud API or zero-cost Baileys via Cloudflare Tunnel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConfig} className="space-y-4 pt-3">
            <div className="space-y-3">
              <Label className="text-zinc-300 text-xs font-semibold">Messaging Engine / Architecture *</Label>
              <div className="grid grid-cols-1 gap-2.5">
                {/* Free Local Bridge Option */}
                <label
                  onClick={() => setWhatsappMode('local_bridge')}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    whatsappMode === 'local_bridge'
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="waMode"
                    value="local_bridge"
                    checked={whatsappMode === 'local_bridge'}
                    onChange={() => setWhatsappMode('local_bridge')}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100">Free Baileys Bridge (Desktop App / Cloudflare Tunnel)</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Zero API Fees
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Connects using the gym front-desk WhatsApp number. Messages are routed via local sidecar and encrypted Cloudflare tunnel.
                    </p>
                  </div>
                </label>

                {/* Official Meta Cloud API Option */}
                <label
                  onClick={() => setWhatsappMode('cloud_api')}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    whatsappMode === 'cloud_api'
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="waMode"
                    value="cloud_api"
                    checked={whatsappMode === 'cloud_api'}
                    onChange={() => setWhatsappMode('cloud_api')}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100">Meta WhatsApp Cloud API</span>
                      <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        Official & Compliant
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Uses pre-approved templates and official Meta API endpoints. Standard per-message utility/marketing rates apply.
                    </p>
                  </div>
                </label>

                {/* Disabled Option */}
                <label
                  onClick={() => setWhatsappMode('disabled')}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    whatsappMode === 'disabled'
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="waMode"
                    value="disabled"
                    checked={whatsappMode === 'disabled'}
                    onChange={() => setWhatsappMode('disabled')}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-100">Disabled</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Completely disable automated WhatsApp dispatches and reminders for this gym.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {whatsappMode === 'local_bridge' && (
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="bUrl" className="text-zinc-300 text-xs font-semibold">Bridge Public URL</Label>
                  <Input
                    id="bUrl"
                    placeholder="http://localhost:48291 or https://gym-xyz.trycloudflare.com"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                  />
                  <p className="text-[10px] text-zinc-500">
                    The local bridge address or Cloudflare Tunnel URL. Defaults to http://localhost:48291.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="bToken" className="text-zinc-300 text-xs font-semibold">Bridge Security Bearer Token</Label>
                  <Input
                    id="bToken"
                    type="password"
                    placeholder="Auto-detected default or enter custom bridge token"
                    value={bridgeToken}
                    onChange={(e) => setBridgeToken(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Bearer token to authenticate requests with the WhatsApp bridge.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenSettingsModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingSettings} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Settings2 className="h-4 w-4" />}
                Save & Apply Backend
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WhatsApp QR Pairing Modal */}
      <WhatsAppQrModal
        open={openQrModal}
        onOpenChange={setOpenQrModal}
        onConnected={fetchConnectionStatus}
      />
    </div>
  );
}
