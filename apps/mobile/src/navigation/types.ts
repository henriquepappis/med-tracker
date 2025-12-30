export type Medication = {
  id: number;
  name: string;
  dosage: string;
  instructions?: string | null;
  is_active: boolean;
};

export type Schedule = {
  id: number;
  medication_id: number;
  recurrence_type: 'daily' | 'weekly' | 'interval';
  times?: string[] | null;
  weekdays?: string[] | null;
  interval_hours?: number | null;
  is_active: boolean;
};

export type Intake = {
  id: number;
  schedule_id: number;
  medication_id: number;
  status: 'taken' | 'skipped';
  taken_at: string;
};

export type AppStackParamList = {
  Home: undefined;
  Medications: undefined;
  MedicationForm: { medication?: Medication };
  Schedules: { medication: Medication };
  ScheduleForm: { medication: Medication };
  Intakes: undefined;
  Settings: undefined;
  Legal: undefined;
};
