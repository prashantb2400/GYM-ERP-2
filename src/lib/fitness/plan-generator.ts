import { Meal, ExerciseDay } from '@/types/database';

export type DietChoice = 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PlanGeneratorInput {
  memberName: string;
  dietChoice: DietChoice;
  fitnessLevel: FitnessLevel;
  bmi: number | null;
  healthGoals: string[];
  gymId: string;
  userId?: string | null;
}

export interface GeneratedDietPlan {
  name: string;
  description: string;
  target_calories: number;
  meals: Meal[];
  is_template: boolean;
  diet_choice: DietChoice;
  total_protein: number;
}

export interface GeneratedExercisePlan {
  name: string;
  description: string;
  days: ExerciseDay[];
  is_template: boolean;
  fitness_level: FitnessLevel;
  days_per_week: number;
  focus_summary: string;
}

export function getDietChoiceLabel(choice?: string | null): string {
  switch (choice) {
    case 'vegetarian':
      return '🥬 Pure Vegetarian';
    case 'non_vegetarian':
      return '🍗 Non-Vegetarian';
    case 'eggetarian':
      return '🥚 Eggetarian (Eggs Allowed)';
    case 'vegan':
      return '🌱 100% Plant-Based (Vegan)';
    default:
      return '🥬 Pure Vegetarian';
  }
}

export function getFitnessLevelLabel(level?: string | null): string {
  switch (level) {
    case 'beginner':
      return 'Beginner (Foundation Split)';
    case 'intermediate':
      return 'Intermediate (Hypertrophy & Strength)';
    case 'advanced':
      return 'Advanced (Periodized Power Split)';
    default:
      return 'Beginner (Foundation Split)';
  }
}

/**
 * Calculates tailored target calories and daily protein based on BMI and Health Goals.
 */
export function calculateNutritionTargets(bmi: number | null, healthGoals: string[] = []): {
  targetCalories: number;
  targetProtein: number;
  calorieStrategy: 'deficit' | 'surplus' | 'maintenance';
} {
  const goalsLower = healthGoals.map(g => g.toLowerCase());
  const isWeightLoss = goalsLower.some(g => g.includes('weight loss') || g.includes('fat loss') || g.includes('shred'));
  const isMuscleGain = goalsLower.some(g => g.includes('muscle') || g.includes('bulk') || g.includes('hypertrophy') || g.includes('mass'));

  let targetCalories = 2200;
  let targetProtein = 120;
  let calorieStrategy: 'deficit' | 'surplus' | 'maintenance' = 'maintenance';

  const safeBmi = bmi && bmi > 0 ? bmi : 23;

  if (isWeightLoss || safeBmi >= 25) {
    // Caloric deficit with elevated protein for lean tissue preservation
    targetCalories = safeBmi >= 30 ? 1800 : 1950;
    targetProtein = 135;
    calorieStrategy = 'deficit';
  } else if (isMuscleGain || safeBmi < 18.5) {
    // Caloric surplus for anabolic growth
    targetCalories = safeBmi < 18.5 ? 2750 : 2600;
    targetProtein = 150;
    calorieStrategy = 'surplus';
  } else {
    // Body recomposition & functional conditioning
    targetCalories = 2250;
    targetProtein = 125;
    calorieStrategy = 'maintenance';
  }

  return { targetCalories, targetProtein, calorieStrategy };
}

/**
 * Generates an automated, nutritionally balanced meal chart respecting the member's dietary preference.
 */
export function generateDietPlan(params: {
  memberName: string;
  dietChoice: DietChoice;
  bmi: number | null;
  healthGoals: string[];
  gymId: string;
  userId?: string | null;
}): GeneratedDietPlan {
  const { memberName, dietChoice, bmi, healthGoals } = params;
  const { targetCalories, targetProtein, calorieStrategy } = calculateNutritionTargets(bmi, healthGoals);

  let meals: Meal[] = [];

  if (dietChoice === 'vegetarian') {
    meals = [
      {
        meal_name: 'Breakfast (8:00 AM)',
        time: '08:00',
        items: [
          { name: 'Oats in Low-Fat Milk with Chia Seeds & Almonds', qty: '60g oats + 200ml milk', calories: 380, protein: 18 },
          { name: 'Sprouted Moong Dal & Pomegranate Chaat', qty: '100g', calories: 150, protein: 10 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack (11:30 AM)',
        time: '11:30',
        items: [
          { name: 'Greek Yogurt with Fresh Blueberries / Berries', qty: '150g', calories: 140, protein: 14 },
          { name: 'Soaked Walnuts & Pumpkin Seeds', qty: '20g', calories: 130, protein: 5 },
        ],
      },
      {
        meal_name: 'Lunch (2:00 PM)',
        time: '14:00',
        items: [
          { name: 'High-Protein Paneer Bhurji / Tofu Toss', qty: '150g paneer', calories: 390, protein: 27 },
          { name: 'Mixed Yellow Moong / Toor Dal', qty: '1 large katori (150ml)', calories: 180, protein: 12 },
          { name: 'Whole Wheat Multigrain Rotis with Green Salad', qty: '2 rotis + cucumber salad', calories: 240, protein: 7 },
        ],
      },
      {
        meal_name: 'Post-Workout / Evening (5:30 PM)',
        time: '17:30',
        items: [
          { name: 'Whey / Plant Protein Shake with Water', qty: '1 scoop (33g)', calories: 130, protein: 25 },
          { name: 'Roasted Makhana (Fox Nuts) with Pinch of Black Salt', qty: '30g', calories: 110, protein: 3 },
        ],
      },
      {
        meal_name: 'Dinner (8:30 PM)',
        time: '20:30',
        items: [
          { name: 'Soya Chunks & Mixed Vegetable Stir-Fry', qty: '60g soya (dry wt)', calories: 290, protein: 31 },
          { name: 'Brown Basmati Rice or Quinoa', qty: '1 cup cooked (130g)', calories: 160, protein: 4 },
          { name: 'Warm Turmeric Cinnamon Milk', qty: '150ml', calories: 90, protein: 5 },
        ],
      },
    ];
  } else if (dietChoice === 'non_vegetarian') {
    meals = [
      {
        meal_name: 'Breakfast (8:00 AM)',
        time: '08:00',
        items: [
          { name: 'Whole Boiled Eggs with Spinach & Multigrain Toast', qty: '3 whole eggs + 2 toasts', calories: 410, protein: 26 },
          { name: 'Fresh Seasonal Fruit (Apple / Papaya)', qty: '1 bowl', calories: 90, protein: 1 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack (11:30 AM)',
        time: '11:30',
        items: [
          { name: 'Plain Greek Yogurt with Honey & Chia Seeds', qty: '150g', calories: 140, protein: 15 },
          { name: 'Mixed Almonds & Cashews', qty: '20g', calories: 125, protein: 4 },
        ],
      },
      {
        meal_name: 'Lunch (2:00 PM)',
        time: '14:00',
        items: [
          { name: 'Herb Grilled Chicken Breast or Steamed Fish Fillet', qty: '180g', calories: 310, protein: 42 },
          { name: 'Steamed Brown Rice with Lemon & Coriander', qty: '1 cup (150g)', calories: 180, protein: 4 },
          { name: 'Mixed Steamed Greens (Broccoli, French Beans, Carrots)', qty: '150g', calories: 85, protein: 4 },
        ],
      },
      {
        meal_name: 'Post-Workout / Evening (5:30 PM)',
        time: '17:30',
        items: [
          { name: 'Whey Protein Isolate Shake', qty: '1 scoop (33g)', calories: 125, protein: 26 },
          { name: 'Boiled Sweet Potato or Banana', qty: '1 medium (120g)', calories: 110, protein: 2 },
        ],
      },
      {
        meal_name: 'Dinner (8:30 PM)',
        time: '20:30',
        items: [
          { name: 'Pan-Seared Chicken or White Fish with Olive Oil', qty: '160g', calories: 280, protein: 38 },
          { name: 'Warm Lentil Soup (Dal Tadka) & Fresh Garden Salad', qty: '1 bowl', calories: 160, protein: 10 },
        ],
      },
    ];
  } else if (dietChoice === 'eggetarian') {
    meals = [
      {
        meal_name: 'Breakfast (8:00 AM)',
        time: '08:00',
        items: [
          { name: '3-Egg Masala Omelet (2 whole + 1 white) with Onions & Chillies', qty: '3 eggs', calories: 290, protein: 21 },
          { name: 'Toasted Multigrain Slices with Avocado / Light Butter', qty: '2 slices', calories: 180, protein: 6 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack (11:30 AM)',
        time: '11:30',
        items: [
          { name: 'Spiced Buttermilk (Chaas) with Roasted Jeera', qty: '250ml', calories: 70, protein: 4 },
          { name: 'Handful of Roasted Peanuts & Walnuts', qty: '25g', calories: 150, protein: 6 },
        ],
      },
      {
        meal_name: 'Lunch (2:00 PM)',
        time: '14:00',
        items: [
          { name: 'Homestyle Egg Curry (2 Boiled Eggs in Onion-Tomato Gravy)', qty: '2 eggs + gravy', calories: 270, protein: 16 },
          { name: 'Low-Fat Paneer Cube Salad with Lemon Vinaigrette', qty: '100g paneer', calories: 240, protein: 18 },
          { name: 'Whole Wheat Phulkas & Crunchy Cucumber Salad', qty: '2 rotis', calories: 210, protein: 6 },
        ],
      },
      {
        meal_name: 'Post-Workout / Evening (5:30 PM)',
        time: '17:30',
        items: [
          { name: 'Whey Protein Shake or 3 Boiled Egg Whites', qty: '1 scoop or 3 whites', calories: 120, protein: 24 },
          { name: 'Whole Grain Crackers or Roasted Chana', qty: '40g', calories: 140, protein: 7 },
        ],
      },
      {
        meal_name: 'Dinner (8:30 PM)',
        time: '20:30',
        items: [
          { name: 'Egg Bhurji with Bell Peppers & Tomatoes', qty: '2 eggs', calories: 210, protein: 14 },
          { name: 'Thick Yellow Dal & Steamed Basmati Rice', qty: '1 cup dal + 1 cup rice', calories: 310, protein: 13 },
        ],
      },
    ];
  } else {
    // Vegan (100% Plant-Based)
    meals = [
      {
        meal_name: 'Breakfast (8:00 AM)',
        time: '08:00',
        items: [
          { name: 'Tofu Scramble with Turmeric, Spinach & Nutritional Yeast', qty: '150g tofu', calories: 230, protein: 22 },
          { name: 'Toasted Sourdough with Chia Seeds', qty: '2 slices', calories: 190, protein: 6 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack (11:30 AM)',
        time: '11:30',
        items: [
          { name: 'Unsweetened Soy Milk with Plant Protein', qty: '250ml + 1 scoop', calories: 210, protein: 28 },
          { name: 'Mixed Pumpkin & Flax Seeds', qty: '20g', calories: 120, protein: 5 },
        ],
      },
      {
        meal_name: 'Lunch (2:00 PM)',
        time: '14:00',
        items: [
          { name: 'Chickpea (Kabuli Chana) & Spinach Gravy', qty: '1 bowl (180g)', calories: 280, protein: 16 },
          { name: 'Steamed Quinoa or Brown Rice', qty: '1 cup (150g)', calories: 180, protein: 6 },
          { name: 'Sautéed Tempeh or Edamame Bowl', qty: '80g', calories: 160, protein: 15 },
        ],
      },
      {
        meal_name: 'Post-Workout / Evening (5:30 PM)',
        time: '17:30',
        items: [
          { name: 'Organic Pea & Rice Isolate Protein with Water', qty: '1 scoop (30g)', calories: 120, protein: 24 },
          { name: 'Roasted Makhana with Rock Salt', qty: '30g', calories: 110, protein: 3 },
        ],
      },
      {
        meal_name: 'Dinner (8:30 PM)',
        time: '20:30',
        items: [
          { name: 'High-Protein Soya Chunk Curry with Bell Peppers', qty: '60g soya (dry)', calories: 290, protein: 31 },
          { name: 'Whole Wheat Roti & Mixed Green Salad', qty: '2 rotis', calories: 220, protein: 6 },
        ],
      },
    ];
  }

  // Calculate actual total protein from meals
  const totalProteinCalculated = meals.reduce(
    (acc, m) => acc + m.items.reduce((itemAcc, item) => itemAcc + (item.protein || 0), 0),
    0
  );

  const goalSummary = healthGoals.length > 0 ? healthGoals.join(', ') : 'Overall Fitness & Wellness';
  const dietLabel = getDietChoiceLabel(dietChoice);

  const name = `${memberName}'s Personalized ${dietLabel.split(' ')[1] || 'Nutrition'} Plan`;
  const description = `Tailored nutrition blueprint calibrated for ${calorieStrategy.toUpperCase()} (${targetCalories} kcal). Formulated around a ${dietLabel} preference with ${totalProteinCalculated}g daily protein target to support ${goalSummary}.`;

  return {
    name,
    description,
    target_calories: targetCalories,
    meals,
    is_template: false,
    diet_choice: dietChoice,
    total_protein: totalProteinCalculated,
  };
}

/**
 * Generates an automated, periodized exercise chart based on Fitness Level, BMI, and Health Goals.
 */
export function generateExercisePlan(params: {
  memberName: string;
  fitnessLevel: FitnessLevel;
  bmi: number | null;
  healthGoals: string[];
  gymId: string;
  userId?: string | null;
}): GeneratedExercisePlan {
  const { memberName, fitnessLevel, bmi, healthGoals } = params;
  const safeBmi = bmi && bmi > 0 ? bmi : 23;
  const isJointSensitive = safeBmi >= 28;

  let days: ExerciseDay[] = [];
  let daysPerWeek = 3;
  let focusSummary = '3-Day Full Body Foundation';

  if (fitnessLevel === 'beginner') {
    daysPerWeek = 3;
    focusSummary = '3-Day Full Body Structural Foundation & Mobility';
    days = [
      {
        day: 'Day 1: Full Body Foundation (A)',
        exercises: [
          {
            name: isJointSensitive ? 'Goblet Squat (Box Assisted)' : 'Barbell / Dumbbell Goblet Squat',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Keep chest high, core braced, knees tracking over toes.',
          },
          {
            name: 'Flat Dumbbell Chest Press',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Controlled eccentric descent (3 seconds down).',
          },
          {
            name: 'Lat Pulldown (Wide Grip)',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Depress shoulder blades before pulling to upper chest.',
          },
          {
            name: 'Plank Hold / Deadbug Core Stability',
            sets: 3,
            reps: '30-45 sec',
            rest_seconds: 45,
            notes: 'Maintain neutral lumbar spine with active glute contraction.',
          },
          {
            name: 'Low-Impact Incline Treadmill Walk (Zone 2)',
            sets: 1,
            reps: '15 mins',
            rest_seconds: 0,
            notes: 'Speed: 4.5 km/h, Incline: 4-6%. Steady nasal breathing.',
          },
        ],
      },
      {
        day: 'Day 2: Full Body Posterior & Upper (B)',
        exercises: [
          {
            name: isJointSensitive ? 'Seated Leg Curl Machine' : 'Dumbbell Romanian Deadlift (RDL)',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Hinge at the hips, feeling hamstring tension, flat back.',
          },
          {
            name: 'Seated Dumbbell Shoulder Overhead Press',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Do not arch lower back; lock out overhead smoothly.',
          },
          {
            name: 'Chest-Supported Neutral Row',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Squeeze rhomboids at peak contraction for 1 second.',
          },
          {
            name: 'Glute Bridge / Hip Thrust (Bodyweight)',
            sets: 3,
            reps: '15',
            rest_seconds: 45,
            notes: 'Hold at top for 2 seconds to reinforce pelvic stability.',
          },
          {
            name: 'Elliptical Cross-Trainer Steady Cardio',
            sets: 1,
            reps: '15 mins',
            rest_seconds: 0,
            notes: 'Moderate resistance, smooth rhythm.',
          },
        ],
      },
      {
        day: 'Day 3: Functional Circuit & Core (C)',
        exercises: [
          {
            name: isJointSensitive ? 'Machine Leg Press (45 Degree)' : 'Walking Dumbbell Lunges',
            sets: 3,
            reps: isJointSensitive ? '12-15' : '10 each leg',
            rest_seconds: 60,
            notes: 'Even pressure through mid-foot; avoid knee valgus.',
          },
          {
            name: 'Incline Dumbbell Press',
            sets: 3,
            reps: '10-12',
            rest_seconds: 60,
            notes: 'Targeting clavicular upper pecs.',
          },
          {
            name: 'Cable Face Pulls with External Rotation',
            sets: 3,
            reps: '15',
            rest_seconds: 45,
            notes: 'Excellent for shoulder posture and rotator cuff health.',
          },
          {
            name: 'Standing Dumbbell Farmer Walks',
            sets: 3,
            reps: '40 meters',
            rest_seconds: 60,
            notes: 'Grip strength and functional anti-lateral flexion core stability.',
          },
          {
            name: 'Rowing Machine or Stationary Cycling',
            sets: 1,
            reps: '15 mins',
            rest_seconds: 0,
            notes: 'Consistent cadence 75-80 RPM.',
          },
        ],
      },
    ];
  } else if (fitnessLevel === 'intermediate') {
    daysPerWeek = 4;
    focusSummary = '4-Day Push / Pull / Legs / Conditioning Hypertrophy Split';
    days = [
      {
        day: 'Day 1: Push (Chest, Front/Side Delts, Triceps)',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Arch upper back, retract scapulae, touch lower sternum.' },
          { name: 'Incline Dumbbell Press (30 Degree)', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Deep stretch at bottom, explosive press.' },
          { name: 'Standing Dumbbell Lateral Raises', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Strict form; lead with elbows, slight forward lean.' },
          { name: 'Cable Rope Tricep Pushdowns', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Flare rope out at bottom lockout.' },
          { name: 'Overhead Dumbbell Tricep Extension', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Full elbow flexion for long-head tricep stretch.' },
        ],
      },
      {
        day: 'Day 2: Pull (Back Thickness, Lats, Rear Delts, Biceps)',
        exercises: [
          { name: 'Trap Bar or Conventional Deadlift', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Brace abdominal wall, push the floor away.' },
          { name: 'Neutral-Grip Lat Pulldown', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Drive elbows down to hip pockets.' },
          { name: 'Seated Cable Row (V-Bar)', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Squeeze lats and middle trapezius.' },
          { name: 'Rear Delt Reverse Cable Flyes', sets: 3, reps: '15', rest_seconds: 45, notes: 'Isolate posterior deltoids.' },
          { name: 'Incline Dumbbell Bicep Curls', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Full supination at the peak.' },
        ],
      },
      {
        day: 'Day 3: Legs & Abs (Quads, Hamstrings, Calves)',
        exercises: [
          { name: 'Barbell Back Squats or Hack Squats', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Depth at parallel or below; control descent.' },
          { name: 'Romanian Deadlifts (Dumbbell or Barbell)', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Load the posterior chain with neutral spine.' },
          { name: 'Bulgarian Split Squats', sets: 3, reps: '10 each', rest_seconds: 60, notes: 'Single-leg strength and hip stabilizer recruitment.' },
          { name: 'Standing Calf Raises', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Full stretch at bottom, 2-sec pause at peak contraction.' },
          { name: 'Hanging Knee/Leg Raises', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Curl pelvis up to activate lower rectus abdominis.' },
        ],
      },
      {
        day: 'Day 4: Upper Power & Conditioning Matrix',
        exercises: [
          { name: 'Overhead Barbell Military Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Core braced, glutes squeezed tight.' },
          { name: 'Chest-Supported T-Bar Row', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Isolate mid-back without spinal momentum.' },
          { name: 'Cable Crossover Pec Flyes', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Constant tension throughout range.' },
          { name: 'EZ-Bar Spider Curls', sets: 3, reps: '12', rest_seconds: 60, notes: 'Strict bicep peak contraction.' },
          { name: 'HIIT Conditioning Intervals (Assault Bike / Sprint)', sets: 6, reps: '30s work / 45s rest', rest_seconds: 45, notes: 'Cardiovascular output and metabolic conditioning.' },
        ],
      },
    ];
  } else {
    // Advanced 5-Day Periodized Hypertrophy & Power Split
    daysPerWeek = 5;
    focusSummary = '5-Day Periodized Hypertrophy, Strength & Power Split';
    days = [
      {
        day: 'Day 1: Chest & Triceps Hypertrophy',
        exercises: [
          { name: 'Barbell Bench Press (Heavy Wave)', sets: 4, reps: '5-8', rest_seconds: 120, notes: 'Progressive overload protocol.' },
          { name: 'Incline Dumbbell Press (Heavy)', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Upper pectoral density.' },
          { name: 'Weighted Chest Dips', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Forward torso lean for sternal head emphasis.' },
          { name: 'Low-to-High Cable Flyes', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Peak contraction squeeze.' },
          { name: 'Close-Grip Bench Press or Skull Crushers', sets: 4, reps: '8-10', rest_seconds: 75, notes: 'Tricep lateral and medial head overload.' },
        ],
      },
      {
        day: 'Day 2: Back Density & Bicep Peak',
        exercises: [
          { name: 'Deadlifts (Conventional / Sumo)', sets: 4, reps: '5', rest_seconds: 150, notes: 'Maximal kinetic chain recruitment.' },
          { name: 'Weighted Pull-Ups (Neutral Grip)', sets: 4, reps: '6-8', rest_seconds: 90, notes: 'Full dead-hang to chin over bar.' },
          { name: 'Single-Arm Dumbbell Row (Meadow Rows)', sets: 3, reps: '10 each', rest_seconds: 75, notes: 'Deep stretch of lat insertion.' },
          { name: 'Barbell Bicep Curls (Strict)', sets: 4, reps: '8-10', rest_seconds: 60, notes: 'No hip swing; control negative.' },
          { name: 'Hammer Curls with Rope Attachment', sets: 3, reps: '12', rest_seconds: 60, notes: 'Brachialis and forearms.' },
        ],
      },
      {
        day: 'Day 3: Quads & Calves Heavy Day',
        exercises: [
          { name: 'Barbell Back Squats', sets: 5, reps: '5-8', rest_seconds: 120, notes: 'Explosive ascent.' },
          { name: 'Hack Squat (Quad Emphasis)', sets: 4, reps: '10-12', rest_seconds: 90, notes: 'Feet low on platform, deep knee flexion.' },
          { name: 'Leg Extensions (Triple Drop Set on final)', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Rectus femoris burnout.' },
          { name: 'Seated Calf Raises', sets: 4, reps: '15', rest_seconds: 45, notes: 'Soleus hypertrophy.' },
          { name: 'Ab Wheel Rollouts', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Anti-extension core development.' },
        ],
      },
      {
        day: 'Day 4: Shoulders & Posterior Delts',
        exercises: [
          { name: 'Standing Overhead Barbell Press (OHP)', sets: 4, reps: '6-8', rest_seconds: 90, notes: 'Full overhead lockout and thoracic extension.' },
          { name: 'Seated Arnold Dumbbell Press', sets: 3, reps: '10-12', rest_seconds: 75, notes: 'Rotating through full anterior to lateral sweep.' },
          { name: 'Lean-Away Cable Lateral Raises', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Continuous tension at side delts.' },
          { name: 'Face Pulls with External Rotation', sets: 4, reps: '15', rest_seconds: 45, notes: 'Rotator cuff and rear delt protection.' },
          { name: 'Heavy Barbell Shrugs', sets: 3, reps: '12', rest_seconds: 60, notes: '2-second isometric pause at peak.' },
        ],
      },
      {
        day: 'Day 5: Hamstrings, Glutes & Metabolic Finisher',
        exercises: [
          { name: 'Barbell Romanian Deadlift (RDL)', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Strict hip hinge loading posterior chain.' },
          { name: 'Barbell Hip Thrusts with Band', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Heavy glute contraction at lockout.' },
          { name: 'Lying Leg Curls', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Knee flexor isolation.' },
          { name: 'Prowler Sled Push or Farmer Walks', sets: 4, reps: '40m', rest_seconds: 60, notes: 'Work capacity, conditioning, and mental grit.' },
        ],
      },
    ];
  }

  const name = `${memberName}'s ${getFitnessLevelLabel(fitnessLevel).split(' ')[0]} Training Protocol`;
  const description = `${daysPerWeek}-Day structured workout protocol engineered for ${fitnessLevel} level. Target: ${focusSummary} to support ${healthGoals.join(', ') || 'athletic progression'}.`;

  return {
    name,
    description,
    days,
    is_template: false,
    fitness_level: fitnessLevel,
    days_per_week: daysPerWeek,
    focus_summary: focusSummary,
  };
}
