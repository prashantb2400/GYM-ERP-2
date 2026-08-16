import { Router } from 'express';
import { supabase } from '../config/supabase';

export function createAttendanceRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/device/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
