begin;

-- The rendered PNG remains the logo copied into finalized offers.
alter table public.companies
  add column logo_svg_source text check (logo_svg_source is null or length(logo_svg_source) <= 200000),
  add column logo_color text check (logo_color is null or logo_color ~ '^#[0-9A-Fa-f]{6}$');

grant update (logo_svg_source, logo_color) on public.companies to authenticated;

commit;
