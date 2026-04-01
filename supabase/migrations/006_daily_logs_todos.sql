alter table public.daily_logs
add column if not exists todo_items jsonb,
add column if not exists todo_reflection text;

comment on column public.daily_logs.todo_items is 'Daily to-do items stored as JSON.';
comment on column public.daily_logs.todo_reflection is 'End-of-day reflection tied to the to-do list.';
