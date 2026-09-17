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
        .eq('gym_id', user.gymId)
        .eq('status', 'pending')
        .limit(3);

      kycDocs?.forEach(doc => {
        const memberName = (doc.members as any)?.name || 'Member';
        const docType = (doc.document_type || 'document').toUpperCase();
        list.push({
          id: doc.id,
          type: 'kyc',
          title: 'Pending KYC Verification',
          description: `${memberName} uploaded ${docType}`,
          time: doc.uploaded_at,
          link: '/dashboard/kyc',
        });
      });

      // 2. Fetch failed WhatsApp logs
      const { data: failedWa } = await supabase
        .from('whatsapp_logs')
        .select('id, recipient_name, template_name, sent_at')
        .eq('gym_id', user.gymId)
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

    // Supabase Real-time channel to listen for KYC uploads (scoped to current gym)
    const channel = supabase
      .channel(`notifications-${user.gymId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_documents', filter: `gym_id=eq.${user.gymId}` },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_logs', filter: `gym_id=eq.${user.gymId}` },
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
    <header className="h-16 border-b border-border/70 bg-card/60 backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Left side info */}
      <div className="flex items-center gap-3.5">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="lg:hidden text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>
        )}
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-foreground tracking-tight leading-tight">
            {gym?.name || 'Gym Admin'}
          </h1>
          {gym?.business_name && (
            <p className="text-[11px] text-muted-foreground hidden sm:block leading-tight mt-0.5">
              {gym.business_name}
            </p>
          )}
        </div>

        {/* Branch Selector for Owner, or Branch Badge for Staff */}
        {isOwner && branches.length > 0 ? (
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Select
              value={selectedBranchId || 'all'}
              onValueChange={(val) => setSelectedBranchId(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-7.5 text-xs bg-muted/40 hover:bg-muted/60 border-border/60 w-[150px] rounded-md transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Branches" />
                </div>
              </SelectTrigger>
              <SelectContent className="border-border/80 bg-popover">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : selectedBranch ? (
          <Badge variant="outline" className="hidden sm:inline-flex text-[11px] bg-muted/40 text-muted-foreground border-border/60 ml-2 font-normal">
            <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
            {selectedBranch.name}
          </Badge>
        ) : null}
      </div>

      {/* Center global search shortcut bar (clickable) */}
      <button
        type="button"
        onClick={() => setCmdOpen(true)}
        aria-label="Search dashboard"
        className="hidden md:flex items-center gap-2 bg-muted/30 hover:bg-muted/60 active:scale-[0.98] border border-border/60 hover:border-border/80 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground w-64 text-left transition-[background-color,border-color,color] duration-150 ease-out cursor-pointer"
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="flex-1 text-[12px]">Search shortcuts...</span>
        <kbd className="inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/70 bg-background/80 px-1 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCmdOpen(true)}
          aria-label="Open search dialog"
          className="md:hidden text-muted-foreground hover:text-foreground h-8 w-8"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* System Online connection indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Online</span>
        </div>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View notifications"
              className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 bg-popover border-border/80 p-0 overflow-hidden shadow-lg rounded-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Alerts</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No pending alerts.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-muted/40 transition-colors duration-120">
                    <div className="font-medium text-xs text-foreground">{n.title}</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.description}</p>
                    <span className="text-[10px] font-mono text-muted-foreground/70 block mt-1">
                      {n.time ? new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-[1px] bg-border/80 mx-1" />

        {/* User profile widget */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-foreground leading-tight">{user?.name || 'User'}</div>
            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{getRoleLabel(user?.role)}</div>
          </div>
          <Avatar className="h-8 w-8 border border-border/80 bg-muted/60">
            {user?.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name || 'Avatar'} />
            ) : null}
            <AvatarFallback className="text-[11px] font-medium bg-muted text-muted-foreground">
              {user?.name?.trim() ? getInitials(user.name) : 'GY'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Render search command list */}
      <CommandMenu open={cmdOpen} setOpen={setCmdOpen} />
    </header>
  );
}
