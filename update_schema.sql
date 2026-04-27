-- เพิ่มคอลัมน์ delivery_time ให้กับตารางการจัดมื้ออาหาร

ALTER TABLE public.erp_member_meal_schedules
ADD COLUMN delivery_time text;
