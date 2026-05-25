// api/releases.js — GET /api/releases
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('ss_releases')
    .select('id, version, type, commit_message, notes, released_at, created_at')
    .limit(20);

  if (error) {
    console.error('[releases] fetch error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ releases: data || [] });
}
