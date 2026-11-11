-- niche-engine 0004: a complete seller profile from the Telegram application.
-- Owner name, a contact phone (shared with one tap in Telegram), logo, the full
-- pickup address Bosta needs, and the sample photos the admin reviews.
-- Run once in Supabase → SQL Editor, after 0003.

alter table sellers add column if not exists owner_name     text;
alter table sellers add column if not exists contact_phone  text;
alter table sellers add column if not exists logo_url       text;
alter table sellers add column if not exists governorate    text;
alter table sellers add column if not exists pickup_address text;
alter table sellers add column if not exists sample_photos  jsonb not null default '[]';

notify pgrst, 'reload schema';
