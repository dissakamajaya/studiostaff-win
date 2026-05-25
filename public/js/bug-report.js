// api/bug-report.js — POST /api/bug-report
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: session } = await supabase
    .from('ss_sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Session expired' });
  }

  const { title, description, type, priority, reported_by, image_data, app_version, user_agent } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  // Validate type & priority
  const validTypes = ['bug', 'feature', 'improvement'];
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!validPriorities.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  // Limit image size (base64 ~2MB = ~2.7MB string)
  if (image_data && image_data.length > 3 * 1024 * 1024) {
    return res.status(400).json({ error: 'Screenshot terlalu besar' });
  }

  const { data, error } = await supabase
    .from('ss_bug_reports')
    .insert({
      title: title.slice(0, 200),
      description: description.slice(0, 5000),
      type,
      priority,
      reported_by: reported_by || session.user_id,
      image_data: image_data || null,
      app_version: (app_version || '').slice(0, 20),
      user_agent: (user_agent || '').slice(0, 300),
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[bug-report] insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, id: data.id });
}
