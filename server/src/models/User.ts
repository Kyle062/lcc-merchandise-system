import db from '../config/db';

export const findUserByUsername = async (username: string) => {
  const [rows]: any = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
};

export const createUser = async (userData: any) => {
  const { username, email, password, role, full_name } = userData;
  const [result]: any = await db.query(
    'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
    [username, email, password, role, full_name]
  );
  return result.insertId;
};