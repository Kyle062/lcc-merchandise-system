import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername, createUser } from '../models/User';

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user: any = await findUserByUsername(username);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// REGISTER
export const register = async (req: Request, res: Response) => {
  const { username, email, password, role, full_name } = req.body;
  console.log('📝 Register attempt:', { username, email, role });
  
  try {
    // 1. Check if user already exists
    const existing = await findUserByUsername(username);
    if (existing) {
      console.log('⚠️ Username already taken');
      return res.status(400).json({ message: 'Username already exists' });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed');

    // 3. Create user
    const userId = await createUser({ 
      username, 
      email, 
      password: hashedPassword, 
      role, 
      full_name 
    });
    
    console.log('✅ User created with ID:', userId);
    res.status(201).json({ message: 'User created', userId });
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      message: 'Error creating user', 
      details: error.message,
      sqlError: error.sqlMessage || null
    });
  }
};