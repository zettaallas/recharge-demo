import { createContext, useContext } from 'react';
import type { Db, SchoolClass, Staff } from '@/types';

// Which class a staff member is looking at. The staff layout holds it; the class picker in the top bar changes it.

/** Classes this person can choose: a class teacher sees their own classes, everyone else sees all. */
export function classesFor(db: Db, staff: Staff): SchoolClass[] {
  return staff.role === 'class_teacher' ? db.classes.filter((c) => c.teacherId === staff.id) : db.classes;
}

export const StaffClassCtx = createContext<{ classId: string | null; setClassId: (id: string) => void }>({
  classId: null,
  setClassId: () => {},
});

export const useStaffClass = () => useContext(StaffClassCtx);
