import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/th';

dayjs.extend(isoWeek);
dayjs.locale('th');

export const getWeekDays = (startDate?: Date) => {
  const start = dayjs(startDate || new Date()).startOf('week');
  
  return Array.from({ length: 7 }).map((_, i) => {
    const date = start.add(i, 'day');
    return {
      date: date.format('YYYY-MM-DD'),
      dayName: date.format('dddd'),
      shortDate: date.format('DD MMM'),
      isToday: date.isSame(dayjs(), 'day')
    };
  });
};

export const formatDisplayDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'ไม่ระบุ';
  const d = dayjs(dateStr);
  return d.isValid() ? d.format('DD MMM YYYY') : 'ไม่ระบุ';
};
