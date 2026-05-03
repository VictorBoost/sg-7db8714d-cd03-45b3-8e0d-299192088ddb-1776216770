-- Create function to auto-generate SEO metadata for new projects
CREATE OR REPLACE FUNCTION generate_project_seo_metadata()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
BEGIN
  -- Get category name
  SELECT name INTO category_name
  FROM categories
  WHERE id = NEW.category_id;

  -- Auto-generate SEO metadata
  NEW.meta_title := category_name || ' in ' || NEW.location;
  
  NEW.meta_description := substring(NEW.description, 1, 100) || ' in ' || NEW.location || 
                          '. Budget $' || NEW.budget || '. Verified local. Hire on BlueTika.';
  
  NEW.meta_keywords := category_name || ', ' || NEW.location || ', NZ, hire, local';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate SEO metadata on INSERT
DROP TRIGGER IF EXISTS auto_generate_project_seo ON projects;
CREATE TRIGGER auto_generate_project_seo
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_seo_metadata();

-- Also handle UPDATE in case category or location changes
DROP TRIGGER IF EXISTS auto_update_project_seo ON projects;
CREATE TRIGGER auto_update_project_seo
  BEFORE UPDATE OF category_id, location ON projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_seo_metadata();