import { Router, Request, Response } from 'express';
import pool from '../db';
import { generateToken, verifyToken } from '../middleware';

const router = Router();

// 模拟发送短信验证码
router.post('/send-code', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    await pool.query(
      'INSERT INTO verification_codes (phone, code, expires_at) VALUES (?, ?, ?)',
      [phone, code, expiresAt]
    );
    // 实际项目中这里应调用阿里云/腾讯云等短信平台API
    console.log(`[Mock SMS] Sending code ${code} to ${phone}`);
    res.json({ message: 'Verification code sent successfully', mockCode: code }); // 返回mockCode方便测试
  } catch (error) {
    console.error('Error sending code:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
});

// 手机号登录/注册
router.post('/login', async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone and code are required' });
  }

  try {
    // 验证验证码
    const [codeRows]: any = await pool.query(
      'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone, code]
    );

    if (codeRows.length === 0) {
      return res.status(401).json({ message: 'Invalid or expired verification code' });
    }

    // 查找或创建用户
    let [userRows]: any = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    let user;

    if (userRows.length === 0) {
      const [result]: any = await pool.query(
        'INSERT INTO users (phone, nickname) VALUES (?, ?)',
        [phone, `用户_${phone.slice(-4)}`]
      );
      const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newUserRows[0];
    } else {
      user = userRows[0];
    }

    // 生成 JWT
    const token = generateToken(user.id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 获取当前用户信息
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT id, phone, nickname, avatar, wechat_openid, qq_openid FROM users WHERE id = ?', [(req as any).userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 模拟第三方 OAuth 登录
router.post('/oauth', async (req: Request, res: Response) => {
  const { provider, authCode } = req.body; // provider: 'wechat' | 'qq'

  if (!provider || !authCode) {
    return res.status(400).json({ message: 'Provider and authCode are required' });
  }

  try {
    // 实际项目中，这里应该拿着 authCode 去调用微信/QQ的接口换取 access_token 和 openid
    const mockOpenId = `${provider}_mock_openid_${authCode}`;
    const openIdField = provider === 'wechat' ? 'wechat_openid' : 'qq_openid';

    let [userRows]: any = await pool.query(`SELECT * FROM users WHERE ${openIdField} = ?`, [mockOpenId]);
    let user;

    if (userRows.length === 0) {
      const [result]: any = await pool.query(
        `INSERT INTO users (${openIdField}, nickname) VALUES (?, ?)`,
        [mockOpenId, `${provider === 'wechat' ? '微信' : 'QQ'}用户`]
      );
      const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newUserRows[0];
    } else {
      user = userRows[0];
    }

    const token = generateToken(user.id);
    res.json({
      message: `${provider} login successful`,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
