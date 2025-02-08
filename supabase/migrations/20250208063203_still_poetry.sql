/*
  # Initial Schema for Remember When App

  1. New Tables
    - profiles
      - Stores user profile information
      - Links to auth.users
    - messages
      - Stores all messages between users
    - saved_memories
      - Stores saved/favorited messages
    
  2. Security
    - RLS enabled on all tables
    - Policies for user data access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  is_lasting_memory boolean DEFAULT false,
  scheduled_for timestamptz,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  media_url text[]
);

-- Create saved_memories table
CREATE TABLE IF NOT EXISTS saved_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  message_id uuid REFERENCES messages(id) NOT NULL,
  note text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_memories ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Messages policies
CREATE POLICY "Users can view messages they've sent or received"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Saved memories policies
CREATE POLICY "Users can view their saved memories"
  ON saved_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save memories"
  ON saved_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved memories"
  ON saved_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();