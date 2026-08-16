import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDietChartHTML } from '@/lib/pdf/diet-template';
import { DietChartData } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const dietId = id;

    // In a real implementation, you would fetch the diet chart by ID.
    // For this boilerplate, we'll try to fetch the member directly or use a mock.
    // Assuming `dietId` could be a diet plan ID or member ID depending on schema.
    
    // We'll fetch gym profile
    const { data: gymProfile } = await supabase
      .from('gym_profiles')
      .select('*')
      .limit(1)
      .single();

    const gymData = gymProfile || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com'
    };

    // Creating mock data since we don't know the exact schema for diet plans
    const templateData: DietChartData = {
      gym: {
        name: gymData.name,
        address: `${gymData.address?.street || ''} ${gymData.address?.city || ''} ${gymData.address?.state || ''} ${gymData.address?.pin || ''}`.trim() || gymData.address || 'Address not provided',
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
      },
      member: {
        id: dietId,
        name: 'John Doe', // Mocked, ideally fetched from DB
        weight: 75,
        goal: 'Fat Loss',
      },
      dateIssued: new Date().toISOString(),
      trainerName: 'Master Trainer',
      trainerNotes: 'Drink at least 3-4 liters of water daily. Avoid sugar and processed foods.',
      meals: [
        {
          name: 'Breakfast',
          time: '08:00 AM',
          items: ['4 Egg Whites', '1 Whole Egg', '2 Slices Whole Wheat Bread', '1 Apple'],
          calories: 350,
          protein: 25,
          carbs: 40,
          fats: 10,
        },
        {
          name: 'Lunch',
          time: '01:30 PM',
          items: ['150g Chicken Breast', '1 Cup Brown Rice', 'Mixed Green Salad'],
          calories: 450,
          protein: 45,
          carbs: 45,
          fats: 8,
        },
        {
          name: 'Dinner',
          time: '08:00 PM',
          items: ['150g Grilled Fish', 'Steamed Broccoli', 'Half Sweet Potato'],
          calories: 300,
          protein: 35,
          carbs: 25,
          fats: 6,
        }
      ],
      totalCalories: 1100, // Reduced for example
      totalProtein: 105,
      totalCarbs: 110,
      totalFats: 24,
    };

    const html = generateDietChartHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="diet-chart-${dietId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate diet chart PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
