'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Eye,
  RefreshCw,
  PowerOff,
  User,
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { GradientText } from '@/components/magicui/gradient-text';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SuperAdminGymsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, trialing: 0 });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchGyms = async () => {
    try {
      setLoading(true);
      // Detailed fetch for gyms with subscriptions and owner
      const query = supabase
        .from('gyms')
        .select(`
          *,
          users!inner(name, email, role),
          platform_subscriptions(status, platform_plans(name, slug))
        `)
        .eq('users.role', 'owner')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      let processedData = data.map((gym: any) => {
        const owner = gym.users[0] || {};
        const sub = gym.platform_subscriptions?.[0] || {};
        const plan = sub.platform_plans || {};
        
        return {
          id: gym.id,
          name: gym.name,
          created_at: gym.created_at,
          ownerName: owner.name,
          ownerEmail: owner.email,
          status: sub.status || 'inactive',
          planName: plan.name || 'No Plan',
          planSlug: plan.slug || 'none',
          membersCount: 0 // Ideally fetched via another query or view, hardcoding 0 for demo if no join available
        };
      });

      if (debouncedSearch.trim()) {
        const searchLower = debouncedSearch.toLowerCase();
        processedData = processedData.filter((g: any) =>
          g.name.toLowerCase().includes(searchLower) || 
          g.ownerEmail.toLowerCase().includes(searchLower)
        );
      }

      if (statusFilter !== 'all') {
        processedData = processedData.filter((g: any) => g.status === statusFilter);
      }
      
      if (planFilter !== 'all') {
        processedData = processedData.filter((g: any) => g.planSlug === planFilter);
      }

      setGyms(processedData);

      // Calculate stats
      const allGyms = data || [];
      const total = allGyms.length;
      let active = 0, suspended = 0, trialing = 0;
      allGyms.forEach((g: any) => {
        const status = g.platform_subscriptions?.[0]?.status;
        if (status === 'active') active++;
        else if (status === 'suspended') suspended++;
        else if (status === 'trialing') trialing++;
      });
      setStats({ total, active, suspended, trialing });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
  }, [debouncedSearch, statusFilter, planFilter]);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'reactivate'} this gym?`)) return;

    try {
      // Assuming we update platform_subscriptions
      const { data: subData, error: subError } = await supabase
        .from('platform_subscriptions')
        .select('id')
        .eq('gym_id', id)
        .single();
        
      if (subError) throw subError;
      
      const { error } = await supabase
        .from('platform_subscriptions')
        .update({ status: newStatus })
        .eq('id', subData.id);

      if (error) throw error;
      toast.success(`Gym ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`);
      fetchGyms();
    } catch (error: any) {
      toast.error('Failed to change status');
    }
  };

  const getPlanColor = (slug: string) => {
    switch(slug.toLowerCase()) {
      case 'pro': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'enterprise': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight from-amber-400 to-amber-600">Gyms Management</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Monitor and manage all gyms on the GymERP platform.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="p-4 flex flex-col justify-center border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gyms</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            <NumberTicker value={stats.total} />
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-4 flex flex-col justify-center border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            <NumberTicker value={stats.active} />
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-4 flex flex-col justify-center border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">On Trial</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            <NumberTicker value={stats.trialing} />
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-4 flex flex-col justify-center border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            <NumberTicker value={stats.suspended} />
          </div>
        </SpotlightCard>
      </div>

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4 relative">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by gym name or owner email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-amber-600"
            />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Plan Tier" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Gyms Table */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : gyms.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No gyms found matching the criteria.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Gym Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Owner</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Plan</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Joined Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms.map((gym) => (
                <TableRow key={gym.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-300 text-xs">
                    {gym.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 bg-zinc-800 border border-zinc-800">
                        <AvatarFallback className="text-[9px] font-bold bg-amber-900/60 text-amber-300">
                          {gym.ownerName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-200 text-xs">{gym.ownerName}</span>
                        <span className="text-zinc-500 text-[10px]">{gym.ownerEmail}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPlanColor(gym.planSlug)}`}>
                      {gym.planName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <GlowingBadge variant={gym.status as any} pulse={gym.status === 'active'}>
                      {gym.status}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {formatDate(gym.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/superadmin/gyms/${gym.id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-amber-400" title="Impersonate">
                        <User className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 ${gym.status === 'suspended' ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-red-400'}`}
                        onClick={() => handleStatusChange(gym.id, gym.status)}
                        title={gym.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      >
                        {gym.status === 'suspended' ? <RefreshCw className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
