import { Request, Response } from 'express';
import db from '../config/db';

// GET all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching products', details: error.message });
  }
};

// GET single product
export const getProduct = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching product', details: error.message });
  }
};

// CREATE product
export const createProduct = async (req: Request, res: Response) => {
  const { name, course, description, price, size, stock_quantity, image_url } = req.body;
  try {
    const [result]: any = await db.query(
      'INSERT INTO products (name, course, description, price, size, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, course || 'All', description, price, size, stock_quantity, image_url || null]
    );
    res.status(201).json({ message: 'Product created', id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating product', details: error.message });
  }
};

// UPDATE product
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, course, description, price, size, stock_quantity, image_url } = req.body;
  try {
    await db.query(
      'UPDATE products SET name = ?, course = ?, description = ?, price = ?, size = ?, stock_quantity = ?, image_url = ? WHERE id = ?',
      [name, course || 'All', description, price, size, stock_quantity, image_url || null, id]
    );
    res.json({ message: 'Product updated' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating product', details: error.message });
  }
};

// DELETE product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting product', details: error.message });
  }
};