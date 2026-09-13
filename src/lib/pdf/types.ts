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

export interface Meal {
  name: string; // e.g., Breakfast, Lunch
  time?: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface DietChartData {
  gym: GymInfo;
  member: {
    id: string;
    name: string;
    age?: number;
    weight?: number;
    height?: string;
    goal?: string;
  };
  dateIssued: string;
  trainerName?: string;
  trainerNotes?: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscleGroups: string[];
  notes?: string;
}

export interface WorkoutDay {
  dayName: string; // e.g., Monday, Day 1
  focus?: string;
  exercises: Exercise[];
}

export interface ExercisePlanData {
  gym: GymInfo;
  member: {
    id: string;
    name: string;
    level?: string;
    goal?: string;
  };
  dateIssued: string;
  trainerName?: string;
  duration?: string; // e.g., 4 weeks
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
