// Simple Node.js API Server for VOID V6
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'void-v6-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (replace with real DB in production)
const users = [];
const posts = [];

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'لا يوجد token' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token غير صالح' });
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'يجب إدخال اسم المستخدم وكلمة المرور' });
    }
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

app.post('/api/posts', authMiddleware, (req, res) => {
  try {
    const { content, image } = req.body;
    
    if (!content && !image) {
      return res.status(400).json({ error: 'يجب إضافة نص أو صورة' });
    }
    
    const post = {
      id: uuidv4(),
      authorId: req.user.userId,
      author: req.user.username,
      content,
      image,
      likes: [],
      comments: [],
      createdAt: new Date()
    };
    
    posts.unshift(post);
    
    res.json({ post });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

app.get('/api/posts', (req, res) => {
  try {
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
  try {
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'المنشور غير موجود' });
    }
    
    const likeIndex = post.likes.indexOf(req.user.userId);
    
    if (likeIndex === -1) {
      post.likes.push(req.user.userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }
    
    res.json({ likes: post.likes.length });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

app.post('/api/posts/:id/comments', authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'يجب إضافة نص للتعليق' });
    }
    
    const post = posts.find(p => p.id === req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'المنشور غير موجود' });
    }
    
    const comment = {
      id: uuidv4(),
      authorId: req.user.userId,
      author: req.user.username,
      content,
      createdAt: new Date()
    };
    
    post.comments.push(comment);
    
    res.json({ comment });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`VOID API running on port ${PORT}`);
});

module.exports = app;
