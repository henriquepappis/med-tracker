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

export type AppStackParamList = {
  Medications: undefined;
  MedicationForm: { medication?: Medication };
  Schedules: { medication: Medication };
  ScheduleForm: { medication: Medication };
};
