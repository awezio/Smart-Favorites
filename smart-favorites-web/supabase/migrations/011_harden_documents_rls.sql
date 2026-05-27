-- Harden document RLS policies for databases that already applied migration 008.
DROP POLICY IF EXISTS "Allow all operations on documents" ON documents;
DROP POLICY IF EXISTS "Allow all operations on document_chunks" ON document_chunks;

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

DROP POLICY IF EXISTS "Users can view own chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can insert own chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can update own chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can delete own chunks" ON document_chunks;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chunks"
  ON document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks"
  ON document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chunks"
  ON document_chunks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks"
  ON document_chunks FOR DELETE
  USING (auth.uid() = user_id);
