import { describe, it, expect } from 'vitest';
import { toSafeUUID } from '@/lib/utils/format';
import {
  calculateNutritionTargets,
  generateDietPlan,
  generateExercisePlan,
  getDietChoiceLabel,
  getFitnessLevelLabel,
} from '@/lib/fitness/plan-generator';
import { generateInvoiceHTML } from '@/lib/pdf/invoice-template';
import { InvoiceData } from '@/lib/pdf/types';

describe('Universal UUID Sanitizer (toSafeUUID)', () => {
  it('should convert sentinel string "none" (in any case or spacing) to null', () => {
    expect(toSafeUUID('none')).toBeNull();
    expect(toSafeUUID('None')).toBeNull();
    expect(toSafeUUID('NONE')).toBeNull();
    expect(toSafeUUID('  none  ')).toBeNull();
  });

  it('should convert null, undefined, empty string, and whitespace to null', () => {
    expect(toSafeUUID('')).toBeNull();
    expect(toSafeUUID('   ')).toBeNull();
    expect(toSafeUUID(null)).toBeNull();
    expect(toSafeUUID(undefined)).toBeNull();
    expect(toSafeUUID('null')).toBeNull();
    expect(toSafeUUID('undefined')).toBeNull();
  });

  it('should reject invalid / malformed string inputs that are not UUIDs', () => {
    expect(toSafeUUID('12345')).toBeNull();
    expect(toSafeUUID('trainer-john')).toBeNull();
    expect(toSafeUUID('c56a4180-invalid-uuid-format')).toBeNull();
    expect(toSafeUUID(12345)).toBeNull();
    expect(toSafeUUID({})).toBeNull();
  });

  it('should return valid UUIDs cleanly', () => {
    const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    expect(toSafeUUID(validUUID)).toBe(validUUID);
    expect(toSafeUUID(`  ${validUUID}  `)).toBe(validUUID);
    expect(toSafeUUID('7b37996c-e1bc-40d6-953b-e1b938bd165b')).toBe('7b37996c-e1bc-40d6-953b-e1b938bd165b');
  });
});

describe('Automated Member Nutrition & Plan Generator', () => {
  describe('calculateNutritionTargets', () => {
    it('should assign caloric deficit and elevated protein for high BMI (>= 25) or Weight Loss goal', () => {
      const overweight = calculateNutritionTargets(28.5, ['General Fitness']);
      expect(overweight.calorieStrategy).toBe('deficit');
      expect(overweight.targetCalories).toBeLessThanOrEqual(2000);
      expect(overweight.targetProtein).toBeGreaterThanOrEqual(130);

      const normalWithWeightLossGoal = calculateNutritionTargets(22.0, ['Weight Loss']);
      expect(normalWithWeightLossGoal.calorieStrategy).toBe('deficit');
      expect(normalWithWeightLossGoal.targetCalories).toBeLessThanOrEqual(2000);
    });

    it('should assign caloric surplus and muscle-building protein for low BMI or Muscle Gain goal', () => {
      const underweight = calculateNutritionTargets(17.4, ['Health']);
      expect(underweight.calorieStrategy).toBe('surplus');
      expect(underweight.targetCalories).toBeGreaterThanOrEqual(2600);
      expect(underweight.targetProtein).toBeGreaterThanOrEqual(140);

      const normalWithBulkingGoal = calculateNutritionTargets(22.5, ['Muscle Gain', 'Strength']);
      expect(normalWithBulkingGoal.calorieStrategy).toBe('surplus');
      expect(normalWithBulkingGoal.targetCalories).toBeGreaterThanOrEqual(2600);
    });

    it('should assign maintenance strategy for normal BMI with general fitness goals', () => {
      const maintenance = calculateNutritionTargets(22.0, ['General Health', 'Cardio Fitness']);
      expect(maintenance.calorieStrategy).toBe('maintenance');
      expect(maintenance.targetCalories).toBe(2250);
      expect(maintenance.targetProtein).toBe(125);
    });
  });

  describe('generateDietPlan with Dietary Preferences', () => {
    const baseParams = {
      memberName: 'Aarav Sharma',
      bmi: 23.5,
      healthGoals: ['Muscle Gain'],
      gymId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    };

    it('should generate a 100% pure vegetarian diet chart without meat or eggs', () => {
      const diet = generateDietPlan({ ...baseParams, dietChoice: 'vegetarian' });
      expect(diet.name).toContain('Aarav Sharma');
      expect(diet.diet_choice).toBe('vegetarian');
      expect(diet.meals.length).toBeGreaterThanOrEqual(4);

      const allFoodItems = diet.meals.flatMap(m => m.items.map(i => i.name.toLowerCase()));
      // Must contain high-protein veg sources
      expect(allFoodItems.some(f => f.includes('paneer') || f.includes('soya') || f.includes('dal') || f.includes('oats'))).toBe(true);
      // Must NOT contain meat, chicken, or eggs
      expect(allFoodItems.some(f => f.includes('chicken') || f.includes('egg') || f.includes('fish') || f.includes('mutton'))).toBe(false);
      expect(diet.total_protein).toBeGreaterThanOrEqual(100);
    });

    it('should generate an authentic non-vegetarian diet chart with lean poultry and eggs', () => {
      const diet = generateDietPlan({ ...baseParams, dietChoice: 'non_vegetarian' });
      expect(diet.diet_choice).toBe('non_vegetarian');
      const allFoodItems = diet.meals.flatMap(m => m.items.map(i => i.name.toLowerCase()));
      expect(allFoodItems.some(f => f.includes('chicken') || f.includes('fish') || f.includes('egg'))).toBe(true);
      expect(diet.total_protein).toBeGreaterThanOrEqual(120);
    });

    it('should generate an eggetarian diet chart with eggs but zero chicken or meat', () => {
      const diet = generateDietPlan({ ...baseParams, dietChoice: 'eggetarian' });
      expect(diet.diet_choice).toBe('eggetarian');
      const allFoodItems = diet.meals.flatMap(m => m.items.map(i => i.name.toLowerCase()));
      expect(allFoodItems.some(f => f.includes('egg') || f.includes('omelet') || f.includes('bhurji'))).toBe(true);
      expect(allFoodItems.some(f => f.includes('chicken') || f.includes('fish') || f.includes('mutton') || f.includes('beef'))).toBe(false);
    });

    it('should generate a 100% plant-based vegan diet without dairy, eggs, or meat', () => {
      const diet = generateDietPlan({ ...baseParams, dietChoice: 'vegan' });
      expect(diet.diet_choice).toBe('vegan');
      const allFoodItems = diet.meals.flatMap(m => m.items.map(i => i.name.toLowerCase()));
      expect(allFoodItems.some(f => f.includes('tofu') || f.includes('soy milk') || f.includes('chickpea') || f.includes('soya'))).toBe(true);
      expect(allFoodItems.some(f => f.includes('paneer') || f.includes('dairy') || f.includes('egg') || f.includes('chicken') || f.includes('curd') || f.includes('yogurt'))).toBe(false);
    });
  });

  describe('generateExercisePlan by Fitness Level & Joint Sensitivity', () => {
    const baseParams = {
      memberName: 'Rohan Patel',
      healthGoals: ['Weight Loss', 'Cardio Fitness'],
      gymId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    };

    it('should generate a 3-day foundation split for beginners with joint-safe modifications if BMI >= 28', () => {
      const plan = generateExercisePlan({ ...baseParams, fitnessLevel: 'beginner', bmi: 31.0 });
      expect(plan.days_per_week).toBe(3);
      expect(plan.days.length).toBe(3);
      const allExercises = plan.days.flatMap(d => d.exercises.map(e => e.name.toLowerCase()));
      // For high BMI, should use joint-assisted movements
      expect(allExercises.some(e => e.includes('box assisted') || e.includes('leg curl') || e.includes('leg press'))).toBe(true);
    });

    it('should generate a 4-day Push/Pull/Legs/Conditioning split for intermediate trainees', () => {
      const plan = generateExercisePlan({ ...baseParams, fitnessLevel: 'intermediate', bmi: 24.0 });
      expect(plan.days_per_week).toBe(4);
      expect(plan.days.length).toBe(4);
      expect(plan.days[0].day).toContain('Push');
      expect(plan.days[1].day).toContain('Pull');
      expect(plan.days[2].day).toContain('Legs');
      expect(plan.days[3].day).toContain('Upper Power & Conditioning');
    });

    it('should generate a 5-day periodized power & hypertrophy split for advanced athletes', () => {
      const plan = generateExercisePlan({ ...baseParams, fitnessLevel: 'advanced', bmi: 23.0 });
      expect(plan.days_per_week).toBe(5);
      expect(plan.days.length).toBe(5);
      expect(plan.days[0].day).toContain('Chest & Triceps');
      expect(plan.days[1].day).toContain('Back Density');
      expect(plan.days[2].day).toContain('Quads & Calves');
    });
  });
});

describe('Invoice Template Blueprint Rendering', () => {
  const sampleInvoice: InvoiceData = {
    gym: {
      name: 'IRON PARADISE GYM',
      address: '12 Ring Road, Bandra West, Mumbai, MH 400050',
      phone: '+91 98765 43210',
      email: 'contact@ironparadisegym.in',
      upiId: 'ironparadise@okaxis',
    },
    invoiceNo: 'INV-2026-0042',
    date: '2026-09-13',
    member: {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Vikram Malhotra',
      phone: '+91 91234 56789',
      memberCode: 'GYM0042',
    },
    items: [
      { description: 'Annual Premium Membership', hsnCode: '999723', qty: 1, rate: 18000, amount: 18000 },
      { description: 'Included Member Blueprint: Pure Vegetarian & Foundation Split', qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 18000,
    cgstAmount: 1620,
    sgstAmount: 1620,
    totalAmount: 21240,
    amountPaid: 21240,
    amountDue: 0,
    paymentMode: 'UPI',
    status: 'PAID',
    fitnessBlueprint: {
      dietName: "Vikram Malhotra's Personalized Vegetarian Nutrition Plan",
      dietChoice: 'vegetarian',
      dietChoiceLabel: '🥬 Pure Vegetarian',
      targetCalories: 2250,
      targetProtein: '125',
      mealsSummary: [
        { name: 'Breakfast', time: '08:00', highlight: 'Oats in Milk & Moong Sprouts' },
        { name: 'Lunch', time: '14:00', highlight: 'Paneer Bhurji & Dal Tadka' },
      ],
      workoutName: "Vikram Malhotra's 3-Day Foundation Protocol",
      fitnessLevel: 'beginner',
      fitnessLevelLabel: 'Beginner (Foundation Split)',
      daysPerWeek: 3,
      targetGoal: 'General Health',
      bmi: 23.2,
      bmiCategory: 'Normal',
      workoutDaysSummary: [
        { day: 'Day 1', focus: 'Squats, Chest Press, Lat Pulldown' },
        { day: 'Day 2', focus: 'RDL, Overhead Press, Cable Rows' },
      ],
    },
  };

  it('should render the executive Member Fitness Blueprint section in the official HTML output', () => {
    const html = generateInvoiceHTML(sampleInvoice);
    expect(html).toContain('INCLUDED MEMBER BLUEPRINT: PERSONALIZED NUTRITION &amp; WORKOUT PROGRAM');
    expect(html).toContain('🥬 Pure Vegetarian');
    expect(html).toContain('2250 kcal');
    expect(html).toContain('125g');
    expect(html).toContain('3 Days/Wk');
    expect(html).toContain('Normal');
    expect(html).toContain('Oats in Milk &amp; Moong Sprouts');
    expect(html).toContain('Squats, Chest Press, Lat Pulldown');
  });

  it('should render 34px bold gym branding at top priority', () => {
    const html = generateInvoiceHTML(sampleInvoice);
    expect(html).toContain('font-size: 34px');
    expect(html).toContain('font-weight: 900');
    expect(html).toContain('IRON PARADISE GYM');
  });

  it('should not render blueprint section if fitnessBlueprint is absent', () => {
    const noBlueprintInvoice: InvoiceData = { ...sampleInvoice, fitnessBlueprint: undefined };
    const html = generateInvoiceHTML(noBlueprintInvoice);
    expect(html).not.toContain('INCLUDED MEMBER BLUEPRINT');
  });
});
