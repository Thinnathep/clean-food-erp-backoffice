import { useState } from 'react'
import { Copy, CheckCheck } from 'lucide-react'

const SQL = `-- วิ่งใน Supabase SQL Editor ครั้งเดียว

-- 1. menus (Master Menu)
create table if not exists menus (
  id serial primary key,
  name_th text not null,
  category text not null,
  protein_type text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. weekly_plans
create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  notes text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. plan_slots
create table if not exists plan_slots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references weekly_plans(id) on delete cascade,
  day_index integer not null,   -- 0=จันทร์ ... 6=อาทิตย์
  slot_index integer not null,  -- 1=มื้อ1, 2=มื้อ2
  menu_id integer references menus(id),
  notes text,
  created_at timestamptz default now(),
  unique(plan_id, day_index, slot_index)
);

-- 4. RLS: allow all (ปรับทีหลังเมื่อมี Auth)
alter table menus enable row level security;
alter table weekly_plans enable row level security;
alter table plan_slots enable row level security;

create policy "allow_all_menus" on menus for all using (true) with check (true);
create policy "allow_all_plans" on weekly_plans for all using (true) with check (true);
create policy "allow_all_slots" on plan_slots for all using (true) with check (true);`

export default function SetupPage() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ padding: '24px', flex: 1, overflow: 'auto', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '2px', marginBottom: '4px' }}>⚙️ SETUP</div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>ตั้งค่าฐานข้อมูล</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
          รัน SQL นี้ใน Supabase Dashboard → SQL Editor เพื่อสร้าง tables ที่จำเป็น
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { step: '1', text: 'ไปที่ Supabase Dashboard → SQL Editor', done: false },
          { step: '2', text: 'คัดลอก SQL ด้านล่าง แล้ว Paste และ Run', done: false },
          { step: '3', text: 'ไปที่หน้า "เมนูทั้งหมด" แล้วกด "นำเข้าเมนูทั้งหมด"', done: false },
          { step: '4', text: 'ไปที่หน้า "วางแผน" แล้วเริ่มวางแผนสัปดาห์แรก!', done: false },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--accent-green)', flexShrink: 0 }}>
              {item.step}
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* SQL Block */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>schema.sql</span>
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: copied ? 'rgba(74,222,128,0.15)' : 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', color: copied ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอก SQL'}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '16px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre' }}>
          {SQL}
        </pre>
      </div>
    </div>
  )
}
