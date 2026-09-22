import db from '../config/db';

export const getAllProducts = async () => {
  const [rows] = await db.query('SELECT * FROM products');
  return rows;
};

export const getProductById = async (id: number) => {
  const [rows]: any = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0];
};

export const updateStock = async (id: number, newQuantity: number) => {
  await db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newQuantity, id]);
};