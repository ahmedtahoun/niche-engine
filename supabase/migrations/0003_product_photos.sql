-- niche-engine 0003: product photos.
-- Sellers send photos to the Telegram bot; the server stores them in the public
-- "products" bucket of Supabase Storage and keeps their addresses on the product.
-- Run once in Supabase → SQL Editor, after 0002.

alter table products add column if not exists images jsonb not null default '[]';

-- Public bucket for product photos (anyone can view; only the server can upload).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('products', 'products', true)
    on conflict (id) do update set public = true;
  end if;
end $$;

notify pgrst, 'reload schema';
