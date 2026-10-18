import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { EnrolledCourse } from '@/server/modules/learning/learning.service';

export function EnrolledCourseCard({ course }: { course: EnrolledCourse }) {
  return (
    <Card className="space-y-3 p-5">
      <div><h3 className="font-semibold">{course.title}</h3><p className="text-sm text-ink/60">{course.instructorName}</p></div>
      <ProgressBar value={course.percent} label={`پیشرفت ${course.title}`} />
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink/60">{course.percent.toLocaleString('fa-IR')}٪ تکمیل</span>
        <Link href={`/dashboard/courses/${course.id}`} className={buttonStyles({ size: 'sm' })}>ادامه</Link>
      </div>
    </Card>
  );
}
