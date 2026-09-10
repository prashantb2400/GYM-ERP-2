'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useBranch } from '@/hooks/useBranch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils/format';
import { Bell, Wifi, Menu, Search, Sun, Moon, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { CommandMenu } from './CommandMenu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';

interface AdminTopbarProps {
  onMenuClick?: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { user } = useAuth();
  const { gym } = useGym();
  const { branches, selectedBranchId, selectedBranch, setSelectedBranchId, isOwner } = useBranch();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getRoleLabel = (role?: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'receptionist') return 'Front Desk';
    if (role === 'trainer') return 'Trainer';
    return '';
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Real-time notifications loader
  const fetchNotifications = React.useCallback(async () => {
    if (!user?.gymId) return;

    try {
      const list: any[] = [];

      // 1. Fetch pending KYC documents
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('id, member_id, document_type, uploaded_at, members(name)')
        .eq('status', 'pending')
        .limit(3);

      kycDocs?.forEach(doc => {
        list.push({
          id: doc.id,
          type: 'kyc',
          title: 'Pending KYC Verification',
          description: `${(doc.members as any)?.name} uploaded ${doc.document_type.toUpperCase()}`,
          time: doc.uploaded_at,
          link: '/dashboard/kyc',
        });
      });

      // 2. Fetch failed WhatsApp logs
      const { data: failedWa } = await supabase
        .from('whatsapp_logs')
        .select('id, recipient_name, template_name, sent_at')
        .eq('status', 'failed')
        .limit(3);

      failedWa?.forEach(log => {
        list.push({
          id: log.id,
          type: 'whatsapp',
          title: 'WhatsApp Delivery Failed',
          description: `Message to ${log.recipient_name || 'Member'} failed`,
          time: log.sent_at,
          link: '/dashboard/whatsapp',
        });
      });

      // Sort by time descending
      list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(list.slice(0, 5));
      setUnreadCount(list.length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user?.gymId]);

  React.useEffect(() => {
    fetchNotifications();

    if (!user?.gymId) return;

    // Supabase Real-time channel to listen for KYC uploads
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_documents' },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_logs' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.gymId, fetchNotifications]);

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-200">
      {/* Left side info */}
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-md font-semibold text-foreground tracking-tight">
            {gym?.name || 'Gym Admin'}
          </h1>
          {gym?.business_name && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              {gym.business_name}
            </p>
          )}
        </div>

        {/* Branch Selector for Owner, or Branch Badge for Staff */}
        {isOwner && branches.length > 0 ? (
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={selectedBranchId || 'all'}
              onValueChange={(val) => setSelectedBranchId(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/60 w-[160px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    📍 {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : selectedBranch ? (
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-secondary/40 text-muted-foreground border-border/60 ml-2">
            📍 {selectedBranch.name}
          </Badge>
        ) : null}
      </div>

      {/* Center global search shortcut bar (clickable) */}
      <button
        onClick={() => setCmdOpen(true)}
        className="hidden md:flex items-center gap-2.5 bg-secondary/40 hover:bg-secondary/70 border border-border/80 px-3 py-1.5 rounded-lg text-xs text-muted-foreground w-64 text-left transition-colors cursor-pointer"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">Search everything...</span>
        <kbd className="inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[9px] font-medium opacity-100">
          ⌘K
        </kbd>
      </button>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCmdOpen(true)}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </Button>

        {/* System Online connection indicator */}
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-xs font-semibold text-green-500">
          <Wifi className="h-3.5 w-3.5 animate-pulse" />
          <span className="hidden sm:inline">Online</span>
        </div>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/60">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Live Alerts</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] text-purple-400 hover:underline font-semibold">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="divide-y divide-zinc-800/50 max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">No pending alerts captured today.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-zinc-800/30 transition-colors">
                    <div className="font-bold text-xs text-zinc-200">{n.title}</div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{n.description}</p>
                    <span className="text-[9px] text-zinc-500 block mt-1">{new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-[1px] bg-border" />

        {/* User profile widget */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-foreground">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</div>
          </div>
          <Avatar className="h-9 w-9 border border-border bg-muted">
            {user?.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-xs font-bold bg-purple-900 text-purple-200">
              {user?.name ? getInitials(user.name) : 'GY'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Render search command list */}
      <CommandMenu open={cmdOpen} setOpen={setCmdOpen} />
    </header>
  );
}
