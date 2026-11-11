-- English texts for the English store (Arabic stays the main text and the order language),
-- and a taste profile for products that have one (coffee: tasting notes, flavor family, scales).
-- products.en = { name, lead, attributes, faq }; sellers.name_en = store name in English;
-- sellers.about = { ar, en }; products.profile = { notes, notesEn, family, scales: { body: 1-5, acidity: 1-5, ... } }.
alter table products add column if not exists en jsonb;
alter table products add column if not exists profile jsonb;
alter table products add column if not exists cost jsonb;      -- wholesale price per option, agreed with the seller (admin and payouts only)
alter table sellers add column if not exists name_en text;
alter table sellers add column if not exists about jsonb;   -- { ar, en }: the seller's story on the store
notify pgrst, 'reload schema';
