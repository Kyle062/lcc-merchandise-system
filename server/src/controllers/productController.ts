import { Request, Response } from 'express';
import db from '../config/db';
import { parseList, parsePositiveInt, parseSort } from '../utils/queryUtils';

// GET all products (public shop and simple consumers)
export const getProducts = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching products', details: error.message });
  }
};

// GET products with server-side search, course filtering, sorting, and pagination
export const getProductsPaged = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || '').trim();
    const courses = parseList(req.query.course).filter((course) => course !== 'All');
    const stockState = String(req.query.stock_state || 'all');
    const sort = parseSort(
      req.query.sort,
      ['id', 'name', 'course', 'price', 'stock_quantity', 'size'],
      'id',
      'asc',
    );
    const page = parsePositiveInt(req.query.page, 1, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ` AND (name LIKE ? OR description LIKE ? OR size LIKE ? OR course LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (courses.length > 0) {
      where += ` AND course IN (${courses.map(() => '?').join(',')})`;
      params.push(...courses);
    }
    if (stockState === 'low') where += ' AND stock_quantity < 10';
    if (stockState === 'out') where += ' AND stock_quantity = 0';
    if (stockState === 'in') where += ' AND stock_quantity >= 10';

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total FROM products ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const [rows]: any = await db.query(
      `SELECT * FROM products ${where}
       ORDER BY ${sort.key} ${sort.dir.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [stockRows]: any = await db.query(`
      SELECT
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS out_count,
        SUM(CASE WHEN stock_quantity < 10 THEN 1 ELSE 0 END) AS low_count,
        SUM(CASE WHEN stock_quantity >= 10 THEN 1 ELSE 0 END) AS in_count
      FROM products
    `);
    const stock = stockRows[0] || {};

    res.json({
      rows,
      total,
      page: safePage,
      limit,
      totalPages,
      stockCounts: {
        all: total,
        low: Number(stock.low_count || 0),
        out: Number(stock.out_count || 0),
        in: Number(stock.in_count || 0),
      },
    });
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