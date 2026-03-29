import express from 'express';
import pool from '../db';

const router = express.Router();

// 收藏行程
router.post('/save', async (req, res) => {
  try {
    const { user_id, destination, plan_data } = req.body;

    if (!user_id || !destination || !plan_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      'INSERT INTO saved_itineraries (user_id, destination, plan_data) VALUES (?, ?, ?)',
      [user_id, destination, JSON.stringify(plan_data)]
    );

    res.status(200).json({ success: true, id: (result as any).insertId });
  } catch (error) {
    console.error('Save itinerary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 取消收藏
router.delete('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM saved_itineraries WHERE id = ?', [id]);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户的收藏列表
router.get('/saved/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM saved_itineraries WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get saved itineraries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;