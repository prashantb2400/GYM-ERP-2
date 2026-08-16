import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('Seeding GymERP Database...');

  try {
    // 1. Create a demo Gym
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert({
        name: 'Iron Fitness HQ',
        business_name: 'Iron Fitness Private Limited',
        phone: '9876543210',
        email: 'contact@ironfitness.com',
        whatsapp_business: '919876543210',
        address: { street: '101, Gym Road, Bandra West', city: 'Mumbai', state: 'Maharashtra', pin: '400050' },
        gstin: '27AAAAA1111A1Z1',
        pan: 'AAAAA1111A',
        tagline: 'Consistency is Key',
        subscription_tier: 'enterprise',
        is_setup_complete: true,
      })
      .select()
      .single();

    if (gymError) throw gymError;
    console.log(`Created Gym: ${gym.name} (${gym.id})`);

    // 2. Create Counter row for the Gym
    const { error: counterError } = await supabase
      .from('counters')
      .insert({
        gym_id: gym.id,
        member_count: 0,
        invoice_count: 0,
      });
    if (counterError) throw counterError;

    // 3. Create Subscription row
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        gym_id: gym.id,
        tier: 'enterprise',
        max_members: 9999,
        is_active: true,
      });
    if (subError) throw subError;

    // 4. Create Staff (Owner, Receptionist, Trainer)
    const staffToCreate = [
      {
        name: 'Amit Sharma',
        email: 'amit.sharma@ironfitness.com',
        phone: '9876543211',
        login_id: 'amit_owner',
        role: 'owner',
        permissions: ['*'],
        is_active: true,
      },
      {
        name: 'Priya Patel',
        email: 'priya.reception@ironfitness.com',
        phone: '9876543212',
        login_id: 'front_desk_1',
        role: 'receptionist',
        permissions: [
          'members.view', 'members.add', 'members.edit',
          'invoices.view', 'invoices.create',
          'attendance.view', 'attendance.mark',
          'followups.view', 'followups.manage',
          'due.view', 'due.collect',
          'whatsapp.send', 'kyc.view', 'plans.view'
        ],
        is_active: true,
      },
      {
        name: 'Raj Singh',
        email: 'raj.coach@ironfitness.com',
        phone: '9876543213',
        login_id: 'trainer_raj',
        role: 'trainer',
        permissions: [
          'members.view',
          'attendance.view', 'attendance.mark',
          'diet.view', 'diet.manage',
          'exercise.view', 'exercise.manage'
        ],
        is_active: true,
        specialization: 'Bodybuilding, Weight Loss',
        bio: 'Certified coach with 6+ years of personal training experience.',
      }
    ];

    const createdStaff: Record<string, any> = {};

    for (const staff of staffToCreate) {
      // First create Supabase auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: 'Password@123',
        email_confirm: true,
        user_metadata: { full_name: staff.name }
      });

      if (authError) throw authError;

      // Insert into public.users
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.user.id,
          gym_id: gym.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          login_id: staff.login_id,
          role: staff.role,
          permissions: staff.permissions,
          is_active: staff.is_active,
          specialization: staff.specialization || null,
          bio: staff.bio || null,
        })
        .select()
        .single();

      if (userError) throw userError;
      createdStaff[staff.role] = userRow;
      console.log(`Created Staff User: ${staff.name} (${staff.role})`);
    }

    // 5. Create Plans
    const plansToCreate = [
      {
        gym_id: gym.id,
        name: 'Monthly Basic',
        duration_days: 30,
        price: 999.00,
        features: ['Gym Access', 'Locker Room Access', 'General Coaching'],
        highlights: ['Most Affordable'],
        is_active: true,
        display_order: 1,
      },
      {
        gym_id: gym.id,
        name: 'Quarterly Pro',
        duration_days: 90,
        price: 2499.00,
        features: ['Gym Access', 'Locker Room Access', 'Custom Diet Charts', '1x Trainer Guidance'],
        highlights: ['Best Value', 'Personal Diet Plan'],
        is_active: true,
        is_popular: true,
        display_order: 2,
      },
      {
        gym_id: gym.id,
        name: 'Annual Elite',
        duration_days: 365,
        price: 7999.00,
        features: ['24/7 Gym Access', 'Dedicated Locker', 'Custom Diet & Workout Charts', 'Assigned Personal Trainer', 'Monthly BMI Tracking'],
        highlights: ['Complete Package', 'Personal Coach Included'],
        is_active: true,
        display_order: 3,
      }
    ];

    const { data: createdPlans, error: plansError } = await supabase
      .from('plans')
      .insert(plansToCreate)
      .select();

    if (plansError) throw plansError;
    console.log(`Created ${createdPlans.length} Plans`);

    // 6. Create Diet and Workout templates
    const { data: dietTemplate, error: dietError } = await supabase
      .from('diet_charts')
      .insert({
        gym_id: gym.id,
        name: 'Weight Loss Plan',
        description: 'Standard caloric deficit meal schedule.',
        target_calories: 1800,
        is_template: true,
        meals: [
          { meal_name: 'Breakfast', time: '08:00 AM', items: [{ name: 'Oats with Almond Milk', qty: '1 bowl', calories: 250, protein: 10 }, { name: 'Boiled Egg Whites', qty: '4', calories: 60, protein: 14 }] },
          { meal_name: 'Lunch', time: '01:30 PM', items: [{ name: 'Grilled Chicken Breast', qty: '150g', calories: 250, protein: 35 }, { name: 'Brown Rice', qty: '1 cup', calories: 200, protein: 4 }, { name: 'Mixed Salad', qty: '1 plate', calories: 50, protein: 1 }] },
          { meal_name: 'Dinner', time: '08:30 PM', items: [{ name: 'Baked Salmon / Paneer', qty: '100g', calories: 200, protein: 20 }, { name: 'Sautéed Vegetables', qty: '1 plate', calories: 80, protein: 2 }] }
        ],
        created_by: createdStaff['trainer'].id,
      })
      .select()
      .single();

    if (dietError) throw dietError;

    const { data: exerciseTemplate, error: exerciseError } = await supabase
      .from('exercise_charts')
      .insert({
        gym_id: gym.id,
        name: 'Push Pull Legs (PPL)',
        description: 'Standard hyper-trophy workout plan.',
        is_template: true,
        days: [
          { day: 'Monday (Push)', exercises: [{ name: 'Incline Dumbbell Press', sets: 4, reps: '8-12', rest_seconds: 90, notes: 'Focus on contraction' }, { name: 'Overhead Shoulder Press', sets: 3, reps: '10-12', rest_seconds: 90 }] },
          { day: 'Wednesday (Pull)', exercises: [{ name: 'Lat Pulldowns', sets: 4, reps: '10-12', rest_seconds: 90 }, { name: 'Barbell Bicep Curls', sets: 3, reps: '12-15', rest_seconds: 60 }] },
          { day: 'Friday (Legs)', exercises: [{ name: 'Barbell Squats', sets: 4, reps: '8-10', rest_seconds: 120 }, { name: 'Leg Extensions', sets: 3, reps: '12-15', rest_seconds: 60 }] }
        ],
        created_by: createdStaff['trainer'].id,
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;
    console.log('Created Workout & Diet Templates');

    // 7. Create Members (3 members)
    const membersToCreate = [
      {
        name: 'Rohan Mehta',
        phone: '9876543220',
        email: 'rohan.mehta@gmail.com',
        dob: '1995-05-15',
        gender: 'male',
        blood_group: 'O+',
        address: '202, Heights Apartment',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin: '400050',
        current_plan_id: createdPlans[1].id, // Quarterly
        plan_start_date: new Date().toISOString().split('T')[0],
        plan_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trainer_id: createdStaff['trainer'].id,
        diet_chart_id: dietTemplate.id,
        exercise_chart_id: exerciseTemplate.id,
        bmi: 23.5,
        height_cm: 180,
        weight_kg: 76,
        health_goals: ['Muscle Gain', 'Cardio Fitness'],
        fitness_level: 'intermediate',
        has_locker: true,
        locker_number: 'L-05',
        total_due: 0,
        total_paid_lifetime: 2499.00,
      },
      {
        name: 'Neha Roy',
        phone: '9876543221',
        email: 'neha.roy@gmail.com',
        dob: '1998-09-22',
        gender: 'female',
        blood_group: 'B+',
        address: '505, Palm Villa',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin: '400052',
        current_plan_id: createdPlans[0].id, // Monthly
        plan_start_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expired 5 days ago
        plan_end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'expired',
        trainer_id: null,
        bmi: 21.2,
        height_cm: 165,
        weight_kg: 58,
        health_goals: ['Weight Loss'],
        fitness_level: 'beginner',
        has_locker: false,
        total_due: 0,
        total_paid_lifetime: 999.00,
      },
      {
        name: 'Karan Malhotra',
        phone: '9876543222',
        email: 'karan.m@gmail.com',
        dob: '1992-12-01',
        gender: 'male',
        current_plan_id: createdPlans[2].id, // Annual
        plan_start_date: new Date().toISOString().split('T')[0],
        plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trainer_id: createdStaff['trainer'].id,
        bmi: 27.8,
        height_cm: 175,
        weight_kg: 85,
        health_goals: ['Strength & Conditioning'],
        fitness_level: 'advanced',
        has_locker: true,
        locker_number: 'L-22',
        total_due: 3000.00, // Dues outstanding
        total_paid_lifetime: 4999.00,
      }
    ];

    for (const member of membersToCreate) {
      // Create auth user for member login
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        phone: `+91${member.phone}`,
        password: 'Password@123',
        phone_confirm: true,
        user_metadata: { full_name: member.name }
      });

      if (authError) throw authError;

      // Increment member count and generate code
      const { data: memberCode } = await supabase.rpc('generate_member_code', {
        p_gym_id: gym.id,
      });

      const { data: memberRow, error: memberError } = await supabase
        .from('members')
        .insert({
          ...member,
          auth_id: authUser.user.id,
          gym_id: gym.id,
          member_code: memberCode || 'GYM0001',
          created_by: createdStaff['receptionist'].id,
        })
        .select()
        .single();

      if (memberError) throw memberError;
      console.log(`Created Member: ${memberRow.name} (${memberRow.member_code})`);

      // Generate invoice
      const { data: invNumber } = await supabase.rpc('generate_invoice_number', {
        p_gym_id: gym.id,
      });

      const planDetails = createdPlans.find(p => p.id === member.current_plan_id);
      const subtotal = Number(planDetails?.price) || 0;
      const total = subtotal + Math.round(subtotal * 0.18 * 100) / 100; // 18% GST

      const { data: invoiceRow, error: invError } = await supabase
        .from('invoices')
        .insert({
          gym_id: gym.id,
          invoice_number: invNumber || 'INV-2026-0001',
          member_id: memberRow.id,
          member_name: memberRow.name,
          line_items: [{ description: `Plan: ${planDetails?.name}`, qty: 1, rate: subtotal, amount: subtotal }],
          subtotal,
          cgst_amount: Math.round(subtotal * 0.09 * 100) / 100,
          sgst_amount: Math.round(subtotal * 0.09 * 100) / 100,
          total,
          amount_paid: total - member.total_due,
          amount_due: member.total_due,
          payment_mode: 'upi',
          status: member.total_due === 0 ? 'paid' : (member.total_due < total ? 'partial' : 'pending'),
          created_by: createdStaff['receptionist'].id,
        })
        .select()
        .single();

      if (invError) throw invError;

      // Write to due_records if they have total_due
      if (member.total_due > 0) {
        await supabase.from('due_records').insert({
          gym_id: gym.id,
          member_id: memberRow.id,
          invoice_id: invoiceRow.id,
          amount: member.total_due,
          status: 'pending',
          due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }
    }

    console.log('Database Seeding Completed Successfully! ✅');
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

main();
