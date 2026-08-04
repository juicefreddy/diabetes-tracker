-- 약·영양제 목록
create table if not exists medications (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  dose text,
  schedule text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- 매일 복용 체크 로그
create table if not exists medication_logs (
  id uuid default gen_random_uuid() primary key,
  medication_id uuid references medications(id) on delete cascade,
  date date not null,
  time_point text not null check (time_point in ('morning', 'lunch', 'evening', 'bedtime')),
  taken_at timestamptz default now(),
  unique(medication_id, date, time_point)
);
