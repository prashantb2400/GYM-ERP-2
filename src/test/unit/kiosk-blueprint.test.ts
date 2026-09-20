import { describe, it, expect } from 'vitest';
import { generateDietAndExerciseBlueprint, MemberFitnessProfile } from '@/lib/server/llm';

describe('Server-Side Blueprint & Nutrition Engine', () => {
  it('calculates appropriate caloric deficit and high protein for fat loss', async () => {
    const profile: MemberFitnessProfile = {
      name: 'Amit Kumar',
      age: 26,
      gender: 'male',
      heightCm: 175,
      weightKg: 80,
      goal: 'fat_loss',
      dietaryPreference: 'vegetarian',
    };

    const blueprint = await generateDietAndExerciseBlueprint(profile);

    expect(blueprint.caloricTarget).toBeGreaterThan(1400);
    expect(blueprint.caloricTarget).toBeLessThan(2600);
    expect(blueprint.macros.proteinGrams).toBeGreaterThanOrEqual(160); // 2.0g/kg for 80kg
    expect(blueprint.dietPlan.meals.length).toBe(4);
    expect(blueprint.workoutPlan.days.length).toBe(6);
  });

  it('generates vegetarian-compliant meal items when vegetarian is selected', async () => {
    const profile: MemberFitnessProfile = {
      name: 'Priya Sharma',
      age: 24,
      gender: 'female',
      heightCm: 162,
      weightKg: 55,
      goal: 'general_fitness',
      dietaryPreference: 'vegetarian',
    };

    const blueprint = await generateDietAndExerciseBlueprint(profile);

    // Verify meals contain vegetarian staples and no meat keywords
    const allMealText = JSON.stringify(blueprint.dietPlan.meals).toLowerCase();
    expect(allMealText).not.toContain('chicken');
    expect(allMealText).not.toContain('fish');
    expect(allMealText).toContain('paneer');
  });

  it('generates comprehensive 6-day split with push, pull, legs, shoulders, arms, and conditioning', async () => {
    const profile: MemberFitnessProfile = {
      name: 'Rohan Verma',
      goal: 'muscle_gain',
      dietaryPreference: 'non_vegetarian',
      weightKg: 72,
    };

    const blueprint = await generateDietAndExerciseBlueprint(profile);

    expect(blueprint.workoutPlan.days.length).toBe(6);
    expect(blueprint.workoutPlan.days[0].day).toContain('Chest');
    expect(blueprint.workoutPlan.days[1].day).toContain('Back');
    expect(blueprint.workoutPlan.days[2].day).toContain('Legs');
  });
});
