-- Add SEO metadata columns to projects table
ALTER TABLE projects 
ADD COLUMN meta_title TEXT,
ADD COLUMN meta_description TEXT,
ADD COLUMN meta_keywords TEXT;

-- Create function to auto-generate SEO metadata
CREATE OR REPLACE FUNCTION generate_project_metadata()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
BEGIN
  -- Get category name
  SELECT name INTO category_name
  FROM categories
  WHERE id = NEW.category_id;

  -- Generate meta_title: "{Category} in {Location}"
  IF category_name IS NOT NULL THEN
    NEW.meta_title := category_name || ' in ' || NEW.location;
  ELSE
    NEW.meta_title := 'Service in ' || NEW.location;
  END IF;

  -- Generate meta_description: "{Description} in {Location}. Budget ${Budget}. Verified local. Hire on BlueTika."
  NEW.meta_description := LEFT(NEW.description, 120) || ' in ' || NEW.location || 
    '. Budget $' || NEW.budget::TEXT || '. Verified local. Hire on BlueTika.';

  -- Generate meta_keywords: "{Category}, {Location}, NZ, hire, local"
  IF category_name IS NOT NULL THEN
    NEW.meta_keywords := category_name || ', ' || NEW.location || ', NZ, hire, local';
  ELSE
    NEW.meta_keywords := NEW.location || ', NZ, hire, local';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate metadata on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_generate_project_metadata ON projects;
CREATE TRIGGER trigger_generate_project_metadata
BEFORE INSERT OR UPDATE OF category_id, location, description, budget
ON projects
FOR EACH ROW
EXECUTE FUNCTION generate_project_metadata();

-- Backfill existing projects with metadata
UPDATE projects p
SET 
  meta_title = COALESCE(c.name, 'Service') || ' in ' || p.location,
  meta_description = LEFT(p.description, 120) || ' in ' || p.location || 
    '. Budget $' || p.budget::TEXT || '. Verified local. Hire on BlueTika.',
  meta_keywords = COALESCE(c.name || ', ', '') || p.location || ', NZ, hire, local'
FROM categories c
WHERE p.category_id = c.id
  AND p.meta_title IS NULL;