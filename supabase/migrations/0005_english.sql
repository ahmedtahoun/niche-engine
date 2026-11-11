-- English texts for the English store (Arabic stays the main text and the order language).
-- products.en = { name, lead, attributes, faq }; sellers.name_en = store name in English.
alter table products add column if not exists en jsonb;
alter table sellers add column if not exists name_en text;
notify pgrst, 'reload schema';
