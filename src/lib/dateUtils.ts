import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/th';

dayjs.extend(isoWeek);
dayjs.locale('th');

export { dayjs };

export const toISO = (date: any) => dayjs(date).format('YYYY-MM-DD');

export const getWeekStart = (date?: any) => dayjs(date || new Date()).startOf('isoWeek');

export const getWeekDates = (startDate: any) => {
  const start = dayjs(startDate).startOf('isoWeek');
  return Array.from({ length: 7 }).map((_, i) => start.add(i, 'day'));
};

export const formatDateTH = (date: any) => dayjs(date).format('DD MMM');

export const formatWeekLabel = (startDate: any) => {
  const start = dayjs(startDate).startOf('isoWeek');
  const end = start.add(6, 'day');
  if (start.month() === end.month()) {
    return `${start.format('D')} - ${end.format('D')} ${start.format('MMMM YYYY')}`;
  }
  return `${start.format('D MMMM')} - ${end.format('D MMMM YYYY')}`;
};

export const getWeekDays = (startDate?: Date) => {
  const start = dayjs(startDate || new Date()).startOf('isoWeek');
  
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
