'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Apple, Loader2, Award, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MemberDietPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [diet, setDiet] = useState<any>(null);

  useEffect(() => {
    const fetchDiet = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data } = await supabase
          .from('members')
          .select('*, diet_charts(*)')
          .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .single();

        if (data?.diet_charts) {
          setDiet(data.diet_charts);
        } else {
          // Mock diet template fallback
          setDiet({
            name: 'Lean Bulk Muscle Plan',
            description: 'Hypertrophy caloric surplus plan.',
            target_calories: 2800,
            meals: [
              {
                meal_name: 'Breakfast',
                time: '08:00 AM',
                items: [
                  { name: 'Oats with milk & whey protein', qty: '1 bowl', calories: 450, protein: 32 },
                  { name: 'Whole eggs scrambled', qty: '3 eggs', calories: 240, protein: 18 }
                ]
              },
              {
                meal_name: 'Lunch',
                time: '01:30 PM',
                items: [
                  { name: 'Basmati Rice', qty: '150g', calories: 350, protein: 6 },
                  { name: 'Grilled Chicken Breast', qty: '200g', calories: 330, protein: 50 },
                  { name: 'Mixed green salad with olive oil', qty: '1 plate', calories: 120, protein: 1 }
                ]
              },
              {
                meal_name: 'Evening Snack',
                time: '05:00 PM',
                items: [
                  { name: 'Roasted almonds & banana', qty: '10 nuts + 1 fruit', calories: 200, protein: 4 }
                ]
              },
              {
                meal_name: 'Dinner',
                time: '09:00 PM',
                items: [
                  { name: 'Whole wheat roti', qty: '2 rotis', calories: 180, protein: 6 },
                  { name: 'Paneer Bhurji / Soya chunks curry', qty: '150g', calories: 280, protein: 24 }
                ]
              }
            ]
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiet();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Nutrition Intake</span>
        <h2 className="text-xl font-black text-zinc-100">{diet?.name || 'Diet Program'}</h2>
        {diet?.target_calories && (
          <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/20 text-[9px] mt-1.5 font-bold">
            Target: {diet.target_calories} Kcal Daily
          </Badge>
        )}
        <p className="text-zinc-500 text-xs mt-1.5">{diet?.description || 'Personal nutrition chart assigned by branch trainers.'}</p>
      </div>

      {/* Meals Loop */}
      <div className="space-y-4">
        {diet?.meals?.map((meal: any, idx: number) => (
          <Card key={idx} className="border-zinc-900 bg-zinc-900/30 overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-900/40 bg-zinc-900/10 flex flex-row justify-between items-center py-3.5">
              <CardTitle className="text-xs font-extrabold text-zinc-200 uppercase tracking-wide">{meal.meal_name}</CardTitle>
              <Badge className="bg-purple-950/60 text-purple-400 border border-purple-800/10 text-[9px] font-mono">
                {meal.time}
              </Badge>
            </CardHeader>
            <CardContent className="pt-3 text-xs space-y-2">
              {meal.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800 last:border-b-0">
                  <div>
                    <span className="font-semibold text-zinc-300 block">{it.name}</span>
                    <span className="text-[10px] text-zinc-500">Portion size: {it.qty}</span>
                  </div>
                  <div className="text-right text-[10px] text-zinc-500 space-x-2">
                    {it.calories && <span>{it.calories} Kcal</span>}
                    {it.protein && <span className="text-purple-400 font-bold">{it.protein}g P</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
