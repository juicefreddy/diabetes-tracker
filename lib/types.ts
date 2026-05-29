export interface BloodGlucose {
  id?: string
  date: string
  time_point: 'fasting' | 'after_breakfast' | 'after_lunch' | 'after_dinner' | 'bedtime'
  value: number
  memo?: string
  created_at?: string
}

export interface Meal {
  id?: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods: string[]
  rice_amount?: 'none' | 'quarter' | 'half' | 'three_quarter' | 'full'
  tomato_check?: boolean
  meal_order_check?: boolean
  ai_analysis?: string
  created_at?: string
}

export interface Exercise {
  id?: string
  date: string
  type: 'walking' | 'stepper' | 'band' | 'cycling' | 'other'
  time_of_day: 'morning' | 'after_lunch' | 'after_dinner' | 'evening'
  duration_minutes: number
  distance_km?: number
  avg_heart_rate?: number
  elevation?: number
  intensity?: 'low' | 'medium' | 'high'
  calories?: number
  created_at?: string
}

export interface PatientProfile {
  id?: string
  diagnosis_date?: string
  diabetes_type?: string
  height_cm?: number
  weight_kg?: number
  medications?: string[]
  comorbidities?: string[]
  protein_goal_g?: number
  created_at?: string
  updated_at?: string
}

export interface LabResult {
  id?: string
  date: string
  hba1c?: number
  fasting_glucose?: number
  ldl?: number
  hdl?: number
  triglycerides?: number
  creatinine?: number
  notes?: string
  created_at?: string
}

export type GlucoseTimePoint = BloodGlucose['time_point']
export type MealType = Meal['meal_type']
export type ExerciseType = Exercise['type']
export type TimeOfDay = Exercise['time_of_day']
