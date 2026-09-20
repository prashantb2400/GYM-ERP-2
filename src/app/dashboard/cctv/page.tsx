'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { fetchWithAuth } from '@/lib/utils/api-client';
import {
  Cctv,
  Camera,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  Radio,
  Plus,
  RefreshCw,
  Maximize2,
  Trash2,
  CheckCircle2,
  UserPlus,
  MessageSquare,
  Eye,
  Sliders,
  Sparkles,
  LayoutGrid,
  Grid2X2,
  Square,
  Clock,
  ExternalLink,
  ChevronRight,
  Activity,
  Loader2,
  ScanFace,
  Fingerprint,
  QrCode,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CameraItem {
  id: string;
  name: string;
  rtsp_url: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  is_active: boolean;
  fps: number;
  last_ping_at: string | null;
  branch_id?: string | null;
  branches?: { id: string; name: string } | null;
  settings?: {
    motion_threshold?: number;
    face_detection?: boolean;
    record_attendance?: boolean;
  };
}

interface VigilanceEvent {
  id: string;
  event_type: 'unknown_visitor' | 'expired_member' | 'due_defaulter' | 'auto_attendance';
  member_id?: string | null;
  member_name?: string | null;
  confidence?: number | null;
  snapshot_url: string;
  status: 'unresolved' | 'acknowledged' | 'lead_created' | 'dismissed';
  metadata?: Record<string, any>;
  created_at: string;
  cctv_cameras?: { id: string; name: string; location: string } | null;
  members?: { id: string; name: string; phone: string; member_code: string } | null;
}

interface AttendanceLog {
  id: string;
  member_name: string;
  check_in_time: string;
  method: string;
  confidence?: number;
  snapshot_url?: string;
  device_name?: string;
  date: string;
}

export default function CctvDashboardPage() {
  const { user } = useAuth();
  const { selectedBranchId, branches } = useBranch();

  // Cameras State
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [gridMode, setGridMode] = useState<'1' | '4' | '9'>('4');
  const [refreshKey, setRefreshKey] = useState(0);

  // Vigilance & Attendance State
  const [vigilanceEvents, setVigilanceEvents] = useState<VigilanceEvent[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [vigilanceFilter, setVigilanceFilter] = useState<'all' | 'unknown' | 'expired'>('all');

  // Modals State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingCamera, setSavingCamera] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamRtsp, setNewCamRtsp] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('Main Entrance');
  const [newCamBranchId, setNewCamBranchId] = useState('');
  const [newCamFaceDetect, setNewCamFaceDetect] = useState(true);
  const [newCamAutoAttend, setNewCamAutoAttend] = useState(true);

  // Snapshot & Lead Modals
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedEventForLead, setSelectedEventForLead] = useState<VigilanceEvent | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  // 1. Fetch Cameras
  const fetchCameras = useCallback(async () => {
    try {
      setLoadingCameras(true);
      const res = await fetchWithAuth('/api/cctv/cameras');
      if (res.ok) {
        const json = await res.json();
        setCameras(json.cameras || []);
      }
    } catch (err) {
      console.warn('Failed to load CCTV cameras:', err);
    } finally {
      setLoadingCameras(false);
    }
  }, []);

  // 2. Fetch Vigilance Events & CCTV Attendance
  const fetchVigilanceAndAttendance = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const [vigRes, attRes] = await Promise.all([
        fetchWithAuth('/api/cctv/vigilance?limit=40'),
        fetchWithAuth('/api/attendance/today'),
      ]);

      if (vigRes.ok) {
        const vigJson = await vigRes.json();
        setVigilanceEvents(vigJson.events || []);
      }

      if (attRes.ok) {
        const attJson = await attRes.json();
        const logs = attJson.attendance || [];
        // Filter for CCTV check-ins
        setAttendanceLogs(logs.filter((a: any) => a.method === 'cctv'));
      }
    } catch (err) {
      console.warn('Failed to load vigilance data:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    fetchVigilanceAndAttendance();

    // Polling interval to keep feeds and FPS stats fresh
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
      fetchVigilanceAndAttendance();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchCameras, fetchVigilanceAndAttendance]);

  // Handle Add Camera Submit
  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName.trim() || !newCamRtsp.trim()) {
      toast.error('Please enter camera name and stream URL');
      return;
    }

    try {
      setSavingCamera(true);
      const res = await fetchWithAuth('/api/cctv/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCamName.trim(),
          rtspUrl: newCamRtsp.trim(),
          location: newCamLocation.trim(),
          branchId: newCamBranchId || null,
          settings: {
            motion_threshold: 0.5,
            face_detection: newCamFaceDetect,
            record_attendance: newCamAutoAttend,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add camera');

      toast.success('CCTV camera configured successfully!');
      setAddModalOpen(false);
      setNewCamName('');
      setNewCamRtsp('');
      fetchCameras();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error configuring camera';
      toast.error(msg);
    } finally {
      setSavingCamera(false);
    }
  };

  // Handle Delete Camera
  const handleDeleteCamera = async (camId: string, camName: string) => {
    if (!confirm(`Are you sure you want to remove "${camName}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/cctv/cameras/${camId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Camera removed');
      fetchCameras();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete camera';
      toast.error(msg);
    }
  };

  // Handle Resolve Vigilance Alert
  const handleResolveAlert = async (eventId: string, newStatus: 'acknowledged' | 'dismissed') => {
    try {
      const res = await fetchWithAuth('/api/cctv/vigilance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Alert marked as ${newStatus}`);
      fetchVigilanceAndAttendance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resolving alert';
      toast.error(msg);
    }
  };

  // Handle Convert to Lead
  const handleConvertToLead = async () => {
    if (!selectedEventForLead) return;
    if (!leadName.trim() || !leadPhone.trim()) {
      toast.error('Please enter visitor name and mobile number');
      return;
    }

    try {
      setSavingLead(true);
      const res = await fetchWithAuth('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName.trim(),
          phone: leadPhone.trim(),
          source: 'cctv_entrance_walkin',
          notes: `Detected at ${selectedEventForLead.cctv_cameras?.name || 'Entrance'} on ${new Date(selectedEventForLead.created_at).toLocaleString('en-IN')}`,
          branchId: selectedBranchId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create lead');

      // Update event status to lead_created
      await fetchWithAuth('/api/cctv/vigilance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventForLead.id, status: 'lead_created' }),
      });

      toast.success(`New lead "${leadName}" created from CCTV visitor!`);
      setLeadModalOpen(false);
      setLeadName('');
      setLeadPhone('');
      setSelectedEventForLead(null);
      fetchVigilanceAndAttendance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert lead';
      toast.error(msg);
    } finally {
      setSavingLead(false);
    }
  };

  // Filtered Vigilance Events
  const filteredEvents = vigilanceEvents.filter((ev) => {
    if (vigilanceFilter === 'unknown') return ev.event_type === 'unknown_visitor';
    if (vigilanceFilter === 'expired') return ev.event_type === 'expired_member' || ev.event_type === 'due_defaulter';
    return true;
  });

  const onlineCameraCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <RequirePermission
      anyPermission={['cctv.view', 'attendance.view', 'settings.view']}
      fallbackTitle="CCTV Vigilance Restricted"
      fallbackDescription="You need surveillance monitoring permissions to access the CCTV live dashboard."
    >
      <div className="space-y-6">
        {/* Top Header & Health Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Cctv className="h-4.5 w-4.5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <span>CCTV Surveillance & Vigilance</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  AI Edge Ingestion
                </span>
              </h1>
            </div>
            <p className="text-zinc-500 text-xs mt-1">
              Live RTSP streams, automated attendance fail-safe for members missing the kiosk, and entrance vigilance alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Universal Kiosk & Attendance Station Switcher */}
            <div className="flex items-center bg-zinc-950 p-0.5 sm:p-1 rounded-xl border border-zinc-800 text-xs gap-0.5 sm:gap-1 shrink-0">
              <Link href="/dashboard/attendance/face-kiosk">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  <ScanFace className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden md:inline">AI Face</span>
                </Button>
              </Link>

              <Link href="/dashboard/attendance/qr-kiosk">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  <QrCode className="h-3.5 w-3.5 text-blue-400" />
                  <span className="hidden md:inline">QR Code</span>
                </Button>
              </Link>

              <Link href="/dashboard/attendance/kiosk">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
                  <span className="hidden md:inline">Fingerprint</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 bg-indigo-600 text-white font-semibold hover:bg-indigo-600 cursor-default"
              >
                <Cctv className="h-3.5 w-3.5 text-white" />
                <span className="hidden md:inline">CCTV AI</span>
              </Button>
            </div>

            {/* Edge AI Health Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${onlineCameraCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineCameraCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              <span className="font-mono text-zinc-300">
                {onlineCameraCount} / {cameras.length} Online
              </span>
            </div>

            {/* Grid Layout Toggles */}
            <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
              <button
                type="button"
                onClick={() => setGridMode('1')}
                title="Single Focus View"
                className={`p-1.5 rounded-lg text-xs transition-colors ${gridMode === '1' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Square className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setGridMode('4')}
                title="Quad View (2x2)"
                className={`p-1.5 rounded-lg text-xs transition-colors ${gridMode === '4' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setGridMode('9')}
                title="Multi View (3x3)"
                className={`p-1.5 rounded-lg text-xs transition-colors ${gridMode === '9' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchCameras();
                fetchVigilanceAndAttendance();
                toast.success('Feeds refreshed');
              }}
              className="border-zinc-800 text-zinc-300 hover:text-white text-xs h-9 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 px-3.5 gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Camera
            </Button>
          </div>
        </div>

        {/* Main 2-Column Split Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Area (8 cols on XL): Live Camera Monitor Matrix */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                <h2 className="text-sm font-bold tracking-tight text-zinc-200 uppercase">Live Stream Matrix</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Low Latency AI Inspection
              </span>
            </div>

            {loadingCameras ? (
              <div className="h-[420px] rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-zinc-400">Connecting to CCTV Streams...</p>
              </div>
            ) : cameras.length === 0 ? (
              <div className="h-[420px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center text-center p-6">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Camera className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">No CCTV Cameras Configured</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
                  Connect your gym's IP cameras via local RTSP stream URLs (Hikvision, CP Plus, Dahua, Uniview) to start automated attendance and vigilance.
                </p>
                <Button
                  onClick={() => setAddModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Configure Entrance Camera
                </Button>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  gridMode === '1'
                    ? 'grid-cols-1'
                    : gridMode === '4'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {cameras.map((cam) => {
                  const isOnline = cam.status === 'online';
                  return (
                    <div
                      key={cam.id}
                      className="group relative rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl hover:border-zinc-700 transition-all"
                    >
                      {/* Video Stream Element / Test Card */}
                      <div className="relative aspect-video w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                        {/* Stream Image */}
                        <img
                          src={`/api/cctv/stream/${cam.id}?t=${refreshKey}`}
                          alt={cam.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />

                        {/* Top HUD Overlay */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white shadow-sm">
                            <span className={`size-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            <span className="font-semibold">{cam.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
                            <span>{cam.location || 'Entrance'}</span>
                            <span>•</span>
                            <span className="text-indigo-400">{cam.fps || 15} FPS</span>
                          </div>
                        </div>

                        {/* Bottom Actions Overlay (Visible on Hover) */}
                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedSnapshot(`/api/cctv/stream/${cam.id}?t=${Date.now()}`)}
                            title="Expand Stream"
                            className="size-7 rounded-lg bg-black/80 border-zinc-700 text-white hover:bg-zinc-800"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteCamera(cam.id, cam.name)}
                            title="Delete Camera"
                            className="size-7 rounded-lg bg-black/80 border-zinc-700 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Camera Info Footer */}
                      <div className="p-3 bg-zinc-950 flex items-center justify-between border-t border-zinc-800/60 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-zinc-400 text-[11px] truncate font-mono">
                            {cam.rtsp_url.replace(/:[^:@]+@/, ':***@')}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {cam.branches?.name || 'All Branches'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Area (4 cols on XL): Real-Time Vigilance & Attendance Ticker */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-zinc-800 bg-zinc-950/60">
              <CardHeader className="pb-3 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-indigo-400" />
                    <CardTitle className="text-sm font-bold text-zinc-100">Live AI Feed</CardTitle>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Real-Time
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs defaultValue="vigilance" className="w-full">
                  <div className="px-3 pt-3 border-b border-zinc-800/40">
                    <TabsList className="w-full bg-zinc-900/90 h-8 p-0.5">
                      <TabsTrigger value="vigilance" className="flex-1 text-xs h-7 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        Vigilance Alerts ({vigilanceEvents.filter((e) => e.status === 'unresolved').length})
                      </TabsTrigger>
                      <TabsTrigger value="attendance" className="flex-1 text-xs h-7 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        Auto-Attendance ({attendanceLogs.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab 1: Vigilance Alerts */}
                  <TabsContent value="vigilance" className="m-0 p-3 space-y-3 max-h-[600px] overflow-y-auto">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => setVigilanceFilter('all')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                          vigilanceFilter === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setVigilanceFilter('unknown')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                          vigilanceFilter === 'unknown' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Unknown Visitors
                      </button>
                      <button
                        type="button"
                        onClick={() => setVigilanceFilter('expired')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                          vigilanceFilter === 'expired' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Expired Members
                      </button>
                    </div>

                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-10 px-4 text-zinc-500">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />
                        <p className="text-xs font-semibold text-zinc-400">No Unresolved Alerts</p>
                        <p className="text-[11px] mt-1">Entrance is clear. No unauthorized tailgaters or expired members detected.</p>
                      </div>
                    ) : (
                      filteredEvents.map((ev) => {
                        const isUnknown = ev.event_type === 'unknown_visitor';
                        const isResolved = ev.status !== 'unresolved';
                        const timeString = new Date(ev.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <div
                            key={ev.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isResolved
                                ? 'border-zinc-800/40 bg-zinc-950/30 opacity-60'
                                : isUnknown
                                ? 'border-amber-500/20 bg-amber-950/10'
                                : 'border-red-500/20 bg-red-950/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isUnknown
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}
                                >
                                  {isUnknown ? 'Unknown Visitor' : 'Expired Member'}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">{timeString}</span>
                              </div>

                              <span className="text-[10px] text-zinc-500">
                                {ev.cctv_cameras?.location || 'Entrance'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2.5">
                              {/* Snapshot Thumbnail */}
                              {ev.snapshot_url ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedSnapshot(ev.snapshot_url)}
                                  className="size-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 hover:border-indigo-500 transition-colors"
                                >
                                  <img src={ev.snapshot_url} alt="Crop" className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <div className="size-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                                  <Camera className="h-5 w-5" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-semibold text-zinc-100 truncate">
                                  {isUnknown ? 'Unregistered Visitor' : ev.member_name || 'Member'}
                                </h4>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {isUnknown
                                    ? 'Walked past turnstile / kiosk'
                                    : `Plan expired • ${ev.members?.phone || ''}`}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {!isResolved && (
                              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/40">
                                {isUnknown ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEventForLead(ev);
                                        setLeadName('Visitor ' + timeString);
                                        setLeadModalOpen(true);
                                      }}
                                      className="h-7 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white gap-1 flex-1"
                                    >
                                      <UserPlus className="h-3 w-3" />
                                      Add as Lead
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResolveAlert(ev.id, 'dismissed')}
                                      className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white"
                                    >
                                      Dismiss
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <a
                                      href={`https://wa.me/91${ev.members?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `Hi ${ev.member_name}, your gym membership has expired. Please renew at the front desk to continue your workouts!`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex-1"
                                    >
                                      <Button
                                        size="sm"
                                        className="w-full h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        WhatsApp Alert
                                      </Button>
                                    </a>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResolveAlert(ev.id, 'acknowledged')}
                                      className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white"
                                    >
                                      Acknowledge
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* Tab 2: CCTV Auto-Attendance Log */}
                  <TabsContent value="attendance" className="m-0 p-3 space-y-2.5 max-h-[600px] overflow-y-auto">
                    {attendanceLogs.length === 0 ? (
                      <div className="text-center py-10 px-4 text-zinc-500">
                        <UserCheck className="h-8 w-8 mx-auto mb-2 text-indigo-500/40" />
                        <p className="text-xs font-semibold text-zinc-400">No CCTV Check-Ins Yet Today</p>
                        <p className="text-[11px] mt-1">Members recognized by CCTV cameras who missed the kiosk will appear here automatically.</p>
                      </div>
                    ) : (
                      attendanceLogs.map((att) => {
                        const checkInTime = new Date(att.check_in_time).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <div
                            key={att.id}
                            className="p-2.5 rounded-xl border border-zinc-800/60 bg-zinc-950/40 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                {att.member_name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-zinc-100">{att.member_name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                                  <span>{att.device_name || 'Lobby CCTV'}</span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-mono">
                                    {Math.round((att.confidence || 0.9) * 100)}% Match
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono text-zinc-400 font-medium">
                              {checkInTime}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Camera Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100">
            <form onSubmit={handleAddCamera}>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Add CCTV Camera</DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs">
                  Connect a local IP camera or NVR using its RTSP stream URL for continuous entrance vigilance.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Camera Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Main Lobby Entrance Turnstile"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    className="h-10 bg-zinc-900 border-zinc-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">RTSP Stream URL *</Label>
                  <Input
                    required
                    placeholder="rtsp://admin:password@192.168.1.108:554/ch1"
                    value={newCamRtsp}
                    onChange={(e) => setNewCamRtsp(e.target.value)}
                    className="h-10 bg-zinc-900 border-zinc-800 text-xs font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Standard RTSP endpoint for CP Plus, Hikvision, Dahua, Uniview, or TP-Link Tapo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Location Tag</Label>
                    <Input
                      placeholder="e.g. Front Gate"
                      value={newCamLocation}
                      onChange={(e) => setNewCamLocation(e.target.value)}
                      className="h-10 bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>

                  {branches.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Assign Branch</Label>
                      <select
                        value={newCamBranchId}
                        onChange={(e) => setNewCamBranchId(e.target.value)}
                        className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200"
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-zinc-200 font-medium">Face Recognition AI</Label>
                      <p className="text-[10px] text-zinc-500">Matches faces against registered gym members.</p>
                    </div>
                    <Switch checked={newCamFaceDetect} onCheckedChange={setNewCamFaceDetect} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-zinc-200 font-medium">Auto-Mark Attendance</Label>
                      <p className="text-[10px] text-zinc-500">Records attendance if member missed the kiosk.</p>
                    </div>
                    <Switch checked={newCamAutoAttend} onCheckedChange={setNewCamAutoAttend} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)} className="text-xs text-zinc-400">
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCamera} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 gap-1.5">
                  {savingCamera && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Connect Camera
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Snapshot Zoom Modal */}
        <Dialog open={Boolean(selectedSnapshot)} onOpenChange={() => setSelectedSnapshot(null)}>
          <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 p-2 text-zinc-100">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {selectedSnapshot && (
                <img src={selectedSnapshot} alt="Snapshot Preview" className="w-full h-full object-contain" />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Convert Unknown Visitor to Lead Modal */}
        <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
          <DialogContent className="max-w-sm bg-zinc-950 border border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Convert Visitor to Lead</DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Quickly register this unknown visitor as an interested prospect in your CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Visitor Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="h-9 bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Phone Number *</Label>
                <Input
                  required
                  placeholder="e.g. 9876543210"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="h-9 bg-zinc-900 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setLeadModalOpen(false)} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={savingLead || !leadPhone.trim()}
                onClick={handleConvertToLead}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 gap-1.5"
              >
                {savingLead && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Save Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
