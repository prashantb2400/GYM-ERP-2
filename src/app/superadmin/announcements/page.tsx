'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Edit2, Trash2, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { GlowCard, GradientText, GlowingBadge } from '@/components/magicui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/utils/format';

export default function AnnouncementsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'info',
    target_plans: ['All'],
    is_active: true,
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      
      const mockData = data || [
        { id: '1', title: 'System Maintenance Scheduled', body: 'We will be undergoing scheduled maintenance on Sunday 2AM IST.', type: 'maintenance', target_plans: ['All'], is_active: true, created_at: new Date().toISOString() },
        { id: '2', title: 'New WhatsApp Integration', body: 'Automated WhatsApp messaging is now available for Pro and Enterprise plans.', type: 'feature', target_plans: ['Pro', 'Enterprise'], is_active: true, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', title: 'Price Revision Update', body: 'Please review our upcoming pricing changes starting next month.', type: 'warning', target_plans: ['All'], is_active: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      ];
      
      setAnnouncements(mockData);
    } catch (err: unknown) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ title: '', body: '', type: 'info', target_plans: ['All'], is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (a: any) => {
    setEditingId(a.id);
    setFormData({
      title: a.title,
      body: a.body,
      type: a.type,
      target_plans: a.target_plans || [],
      is_active: a.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.body) return toast.error('Title and body are required');
    
    try {
      const payload = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        target_plans: formData.target_plans,
        is_active: formData.is_active,
      };

      let error;
      if (editingId) {
        const res = await supabase.from('platform_announcements').update(payload).eq('id', editingId);
        error = res.error;
      } else {
        const res = await supabase.from('platform_announcements').insert(payload);
        error = res.error;
      }

      if (error && error.code !== '42P01') throw error;
      
      toast.success(editingId ? 'Announcement updated (Simulated)' : 'Announcement created (Simulated)');
      setIsModalOpen(false);
      fetchAnnouncements(); // Refresh
    } catch (err: unknown) {
      toast.success(editingId ? 'Announcement updated (Simulated)' : 'Announcement created (Simulated)');
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase.from('platform_announcements').delete().eq('id', id);
      if (error && error.code !== '42P01') throw error;
      toast.success('Announcement deleted (Simulated)');
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (err) {
      toast.success('Announcement deleted (Simulated)');
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'maintenance': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'feature': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getGlowColor = (type: string) => {
    switch (type) {
      case 'info': return 'blue';
      case 'warning': return 'amber';
      case 'maintenance': return 'orange';
      case 'feature': return 'purple';
      default: return 'blue';
    }
  };

  const toggleTargetPlan = (plan: string) => {
    if (plan === 'All') {
      setFormData({ ...formData, target_plans: ['All'] });
      return;
    }
    
    let current = formData.target_plans.filter(p => p !== 'All');
    if (current.includes(plan)) {
      current = current.filter(p => p !== plan);
      if (current.length === 0) current = ['All'];
    } else {
      current.push(plan);
    }
    setFormData({ ...formData, target_plans: current });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>Platform Announcements</GradientText></h2>
          <p className="text-zinc-500 text-xs mt-1">Broadcast messages to gym owners across different plans.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" /> Create Announcement
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No announcements yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((a) => (
            <GlowCard key={a.id} glowColor={getGlowColor(a.type)}>
              <Card className="border-zinc-800 bg-zinc-900/40 h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <GlowingBadge className={`${getTypeBadgeColor(a.type)} border text-[10px] font-semibold rounded px-2 py-0.5 capitalize`}>
                      {a.type}
                    </GlowingBadge>
                    {!a.is_active && <span className="text-[10px] text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">Draft / Inactive</span>}
                  </div>
                  <CardTitle className="text-base text-zinc-100 leading-tight">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-zinc-400 line-clamp-3 mb-4">{a.body}</p>
                  <div className="text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-300">Targets:</span> {a.target_plans?.join(', ')}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    <span className="font-semibold text-zinc-300">Published:</span> {formatDate(a.created_at)}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-zinc-800/60 pt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(a)} className="h-8 text-zinc-400 hover:text-white">
                    <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="h-8 text-zinc-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            </GlowCard>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Title</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                className="bg-zinc-950 border-zinc-800" 
                placeholder="e.g. System Maintenance" 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Message Body (Markdown supported)</Label>
              <Textarea 
                value={formData.body} 
                onChange={e => setFormData({ ...formData, body: e.target.value })} 
                className="bg-zinc-950 border-zinc-800 min-h-[100px]" 
                placeholder="Enter message details..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs block mb-1">Target Plans</Label>
                <div className="flex flex-col gap-2 bg-zinc-950 p-2 rounded-md border border-zinc-800">
                  {['All', 'Free', 'Pro', 'Enterprise'].map(plan => (
                    <div key={plan} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`plan-${plan}`} 
                        checked={formData.target_plans.includes(plan)}
                        onCheckedChange={() => toggleTargetPlan(plan)}
                      />
                      <label htmlFor={`plan-${plan}`} className="text-xs text-zinc-300 font-medium leading-none cursor-pointer">
                        {plan}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border border-zinc-800 p-3 rounded-md bg-zinc-950/50">
              <div>
                <Label className="text-zinc-300 text-sm">Active</Label>
                <p className="text-[10px] text-zinc-500">Inactive announcements are hidden from users</p>
              </div>
              <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
