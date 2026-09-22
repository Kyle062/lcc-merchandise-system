import db from '../config/db';

export const createOrder = async (orderData: any) => {
  const { user_id, product_id, quantity, total_price } = orderData;
  const [result]: any = await db.query(
    'INSERT INTO orders (user_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)',
    [user_id, product_id, quantity, total_price]
  );
  return result.insertId;
};

export const getOrdersByUserId = async (userId: number) => {
  const [rows] = await db.query(`
    SELECT o.*, p.name as product_name 
    FROM orders o 
    JOIN products p ON o.product_id = p.id 
    WHERE o.user_id = ? 
    ORDER BY o.order_date DESC
  `, [userId]);
  return rows;
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
};