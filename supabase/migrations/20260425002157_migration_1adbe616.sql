-- First add unique constraint to prevent duplicates
ALTER TABLE subcategories
ADD CONSTRAINT subcategories_category_id_slug_key UNIQUE (category_id, slug);

-- Now create subcategories safely
DO $$
DECLARE
  cleaning_id uuid;
  movers_id uuid;
  handyman_id uuid;
  electrical_id uuid;
  plumbers_id uuid;
  landscaping_id uuid;
  painting_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO cleaning_id FROM categories WHERE slug = 'cleaning';
  SELECT id INTO movers_id FROM categories WHERE slug = 'movers';
  SELECT id INTO handyman_id FROM categories WHERE slug = 'handyman';
  SELECT id INTO electrical_id FROM categories WHERE slug = 'electrical';
  SELECT id INTO plumbers_id FROM categories WHERE slug = 'plumbers-and-gas';
  SELECT id INTO landscaping_id FROM categories WHERE slug = 'landscaping';
  SELECT id INTO painting_id FROM categories WHERE slug = 'painting';

  -- Cleaning subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (cleaning_id, 'House Cleaning', 'house-cleaning', 'Regular home cleaning services', 1, true),
    (cleaning_id, 'Commercial Cleaning', 'commercial-cleaning', 'Office and commercial spaces', 2, true),
    (cleaning_id, 'End of Tenancy', 'end-of-tenancy', 'Move-out deep cleaning', 3, true),
    (cleaning_id, 'Window Cleaning', 'window-cleaning', 'Interior and exterior windows', 4, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Movers subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (movers_id, 'House Moving', 'house-moving', 'Full house relocation services', 1, true),
    (movers_id, 'Furniture Delivery', 'furniture-delivery', 'Single item delivery and assembly', 2, true),
    (movers_id, 'Packing Services', 'packing-services', 'Professional packing assistance', 3, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Handyman subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (handyman_id, 'General Repairs', 'general-repairs', 'Mixed odd jobs and repairs', 1, true),
    (handyman_id, 'Assembly', 'assembly', 'Furniture and equipment assembly', 2, true),
    (handyman_id, 'Installation', 'installation', 'Appliance and fixture installation', 3, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Electrical subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (electrical_id, 'Wiring & Rewiring', 'wiring-rewiring', 'Electrical wiring services', 1, true),
    (electrical_id, 'Lighting Installation', 'lighting-installation', 'Light fixtures and switches', 2, true),
    (electrical_id, 'Power Points', 'power-points', 'Socket installation and repair', 3, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Plumbers subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (plumbers_id, 'Leak Repairs', 'leak-repairs', 'Tap and pipe leak fixes', 1, true),
    (plumbers_id, 'Drain Cleaning', 'drain-cleaning', 'Blocked drain services', 2, true),
    (plumbers_id, 'Hot Water', 'hot-water', 'Hot water system installation and repair', 3, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Landscaping subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (landscaping_id, 'Lawn Mowing', 'lawn-mowing', 'Regular lawn maintenance', 1, true),
    (landscaping_id, 'Garden Design', 'garden-design', 'Landscape design and planting', 2, true),
    (landscaping_id, 'Tree Services', 'tree-services', 'Tree trimming and removal', 3, true),
    (landscaping_id, 'Hedge Trimming', 'hedge-trimming', 'Hedge maintenance and shaping', 4, true)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Painting subcategories
  INSERT INTO subcategories (category_id, name, slug, description, display_order, is_active)
  VALUES
    (painting_id, 'Interior Painting', 'interior-painting', 'Inside walls and ceilings', 1, true),
    (painting_id, 'Exterior Painting', 'exterior-painting', 'Outside walls and weatherboards', 2, true),
    (painting_id, 'Deck Staining', 'deck-staining', 'Deck restoration and staining', 3, true)
  ON CONFLICT (category_id, slug) DO NOTHING;
END $$;

-- Verify all categories now have subcategories
SELECT 
  c.name as category,
  COUNT(s.id) as subcategory_count,
  string_agg(s.name, ', ' ORDER BY s.display_order) as subcategories
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id AND s.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY c.display_order;