import db from "../config/db";

export const findUserByUsername = async (username: string) => {
  const [rows]: any = await db.query("SELECT * FROM users WHERE username = ?", [
    username,
  ]);
  return rows[0];
};

export const createUser = async (userData: any) => {
  const { username, email, password, role, full_name, course, status } =
    userData;
  const [result]: any = await db.query(
    `INSERT INTO users (username, email, password, role, full_name, course, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      email,
      password,
      role,
      full_name,
      course || null,
      status || "Pending",
    ],
  );
  return result.insertId;
};

export const getAllUsers = async () => {
  const [rows] = await db.query(
    `SELECT id, username, email, role, full_name, course, status, rejection_reason, created_at 
     FROM users ORDER BY created_at DESC`,
  );
  return rows;
};

export const getUserById = async (id: number) => {
  const [rows]: any = await db.query(
    `SELECT id, username, email, role, full_name, course, status, rejection_reason, created_at 
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0];
};

export const updateUserStatus = async (
  id: number,
  status: string,
  rejection_reason: string | null = null,
) => {
  await db.query(
    "UPDATE users SET status = ?, rejection_reason = ? WHERE id = ?",
    [status, rejection_reason, id],
  );
};

export const updateUserRole = async (id: number, role: string) => {
  await db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
};

export const deleteUser = async (id: number) => {
  await db.query("DELETE FROM users WHERE id = ?", [id]);
};
