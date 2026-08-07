"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/ui/input";

export function AttendanceTeacherFilter({
  teachers,
  selectedTeacherId,
}: {
  teachers: { id: string; fullName: string }[];
  selectedTeacherId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="w-full sm:w-64">
      <Select
        aria-label="Filter by teacher"
        value={selectedTeacherId}
        onChange={(e) => {
          const value = e.target.value;
          router.push(value ? `${pathname}?teacherId=${value}` : pathname);
        }}
      >
        <option value="">All teachers</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.fullName}
          </option>
        ))}
      </Select>
    </div>
  );
}
