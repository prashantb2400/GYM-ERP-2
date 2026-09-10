'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Branch } from '@/types/database';
import { useAuth } from './useAuth';

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string | null; // null = All Branches (for owners)
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: string | null) => void;
  loading: boolean;
  refreshBranches: () => Promise<void>;
  isOwner: boolean;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: null,
  selectedBranch: null,
  setSelectedBranchId: () => {},
  loading: true,
  refreshBranches: async () => {},
  isOwner: false,
});

const STORAGE_KEY = 'gymerp_selected_branch';

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.role === 'owner';

  const fetchBranches = useCallback(async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('gym_id', user.gymId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const branchList = (data as Branch[]) || [];
      setBranches(branchList);

      if (isOwner) {
        // Retrieve persisted branch preference for owner
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved && branchList.some(b => b.id === saved)) {
          setSelectedBranchIdState(saved);
        } else {
          setSelectedBranchIdState(null); // Default to 'All Branches'
        }
      } else {
        // Staff is strictly pinned to their assigned branch
        setSelectedBranchIdState(user?.branchId || (branchList[0]?.id ?? null));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isOwner, supabase]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const setSelectedBranchId = useCallback((id: string | null) => {
    if (!isOwner) return; // Non-owners cannot switch branches
    setSelectedBranchIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isOwner]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        selectedBranch,
        setSelectedBranchId,
        loading,
        refreshBranches: fetchBranches,
        isOwner,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
