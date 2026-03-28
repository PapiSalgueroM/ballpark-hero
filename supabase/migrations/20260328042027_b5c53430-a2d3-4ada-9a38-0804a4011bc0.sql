
-- Create saved_brackets table
CREATE TABLE public.saved_brackets (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bracket_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_brackets ENABLE ROW LEVEL SECURITY;

-- Anyone can view any bracket (for shared URLs)
CREATE POLICY "Anyone can view saved brackets"
  ON public.saved_brackets FOR SELECT
  TO public
  USING (true);

-- Users can insert their own brackets
CREATE POLICY "Users can insert their own brackets"
  ON public.saved_brackets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own brackets
CREATE POLICY "Users can update their own brackets"
  ON public.saved_brackets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own brackets
CREATE POLICY "Users can delete their own brackets"
  ON public.saved_brackets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
