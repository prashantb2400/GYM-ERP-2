'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScanFace, Fingerprint, PenLine } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AttendanceTickerProps {
  gymId?: string;
  maxItems?: number;
  className?: string;
}

interface AttendanceEvent {
  id: string;
  member_id: string;
  check_in_time: string;
  method: 'face' | 'fingerprint' | 'manual';
  member: {
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  };
}

export function AttendanceTicker({ gymId, maxItems = 10, className = '' }: AttendanceTickerProps) {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch of recent attendance (mocked for now, would be a real query)
    const fetchRecent = async () => {
      // Setup realtime subscription
      const channel = supabase
        .channel('attendance_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_logs',
            filter: gymId ? `gym_id=eq.${gymId}` : undefined,
          },
          async (payload) => {
            // Fetch member details for the new log
            const { data: memberData } = await supabase
              .from('members')
              .select('first_name, last_name, avatar_url')
              .eq('id', payload.new.member_id)
              .single();

            if (memberData) {
              const newEvent: AttendanceEvent = {
                id: payload.new.id,
                member_id: payload.new.member_id,
                check_in_time: payload.new.check_in_time,
                method: payload.new.method as AttendanceEvent['method'],
                member: memberData,
              };

              setEvents((prev) => {
                const updated = [newEvent, ...prev];
                return updated.slice(0, maxItems);
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchRecent();
  }, [gymId, maxItems, supabase]);

  const getMethodDetails = (method: string) => {
    switch (method) {
      case 'face':
        return { icon: ScanFace, color: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'Face' };
      case 'fingerprint':
        return { icon: Fingerprint, color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Fingerprint' };
      case 'manual':
      default:
        return { icon: PenLine, color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Manual' };
    }
  };

  return (
    <div className={`flex flex-col space-y-2 overflow-hidden ${className}`}>
      <AnimatePresence>
        {events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 text-center text-muted-foreground animate-pulse"
          >
            Waiting for check-ins...
          </motion.div>
        ) : (
          events.map((event) => {
            const MethodIcon = getMethodDetails(event.method).icon;
            const methodColor = getMethodDetails(event.method).color;
            const methodLabel = getMethodDetails(event.method).label;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={event.member.avatar_url || ''} />
                    <AvatarFallback>
                      {event.member.first_name[0]}{event.member.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {event.member.first_name} {event.member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.check_in_time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`flex items-center gap-1 ${methodColor}`}>
                  <MethodIcon className="w-3 h-3" />
                  {methodLabel}
                </Badge>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
