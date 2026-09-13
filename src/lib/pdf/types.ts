export interface GymInfo {
  name: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
  upiId?: string;
  branchName?: string;
}

export interface InvoiceItem {
  description: string;
  hsnCode?: string;
  qty?: number;
  rate?: number;
  amount: number;
}

export interface InvoiceData {
  gym: GymInfo;
  invoiceNo: string;
  date: string;
  dueDate?: string;
  member: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    memberCode?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discountAmount?: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  paymentMode?: string;
  cashierName?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  amountInWords: string;
}

export interface DietFoodItem {
  name: string;
  qty?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  notes?: string;
}

export interface Meal {
  name: string; // e.g., Breakfast, Lunch
  time?: string;
  items: (string | DietFoodItem)[];
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
}

export interface DietChartData {
  gym: GymInfo;
  planTitle?: string;
  isTemplate?: boolean;
  member: {
    id: string;
    name: string;
    memberCode?: string;
    age?: number;
    weight?: number;
    height?: string;
    goal?: string;
    phone?: string;
  };
  dateIssued: string;
  targetCalories?: number;
  trainerName?: string;
  trainerNotes?: string;
  waterIntakeLiters?: number;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs?: number;
  totalFats?: number;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscleGroups: string[];
  notes?: string;
  tempo?: string;
}

export interface WorkoutDay {
  dayName: string; // e.g., Monday, Day 1
  focus?: string;
  warmup?: string;
  exercises: Exercise[];
  cooldown?: string;
}

export interface ExercisePlanData {
  gym: GymInfo;
  planTitle?: string;
  isTemplate?: boolean;
  member: {
    id: string;
    name: string;
    memberCode?: string;
    level?: string;
    goal?: string;
    phone?: string;
  };
  dateIssued: string;
  trainerName?: string;
  duration?: string; // e.g., 4 weeks
  daysPerWeek?: number;
  trainerNotes?: string;
  cardioProtocol?: string;
  days: WorkoutDay[];
}

export interface MemberReportData {
  gym: GymInfo;
  member: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    joinDate: string;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    bloodGroup?: string;
    dateOfBirth?: string;
    height?: number;
    weight?: number;
    bmi?: number;
  };
  reportDate: string;
  attendanceStats: {
    totalDays: number;
    presentDaysThisMonth: number;
    currentStreak: number;
  };
  planHistory: {
    planName: string;
    startDate: string;
    endDate: string;
    status: string;
    amount: number;
  }[];
  paymentSummary: {
    totalPaid: number;
    totalPending: number;
  };
}
