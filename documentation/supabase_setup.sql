-- STEP 1: Create the table for playground photos
-- This table links OSM Playground IDs to photos stored in Supabase
CREATE TABLE IF NOT EXISTS playground_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playground_id TEXT NOT NULL,
  url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STEP 2: Enable Row Level Security (RLS)
-- This ensures data is protected while allowing public viewing
ALTER TABLE playground_photos ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create Policies

-- Allow anyone (even logged out users) to view photos
CREATE POLICY "Public Profiles are viewable by everyone" 
ON playground_photos FOR SELECT USING (true);

-- Allow ONLY logged-in users to upload photos
CREATE POLICY "Users can insert their own photos" 
ON playground_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');


/* 
   STORAGE SETUP INSTRUCTIONS:
   1. Go to "Storage" in your Supabase Dashboard.
   2. Create a new Bucket named: playground-photos
   3. Set the bucket to "Public" so guests can see the images.
*/
