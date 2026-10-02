import { Request, Response } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} from "../models/User";

// GET all users (admin)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching users", details: error.message });
  }
};

// GET single user
export const getSingleUser = async (req: Request, res: Response) => {
  try {
    const user = await getUserById(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching user", details: error.message });
  }
};

// APPROVE user (set status to Active)
export const approveUser = async (req: Request, res: Response) => {
  try {
    await updateUserStatus(Number(req.params.id), "Active", null);
    res.json({ message: "User approved" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error approving user", details: error.message });
  }
};

// REJECT user (set status to Rejected + optional reason)
export const rejectUser = async (req: Request, res: Response) => {
  const { reason } = req.body;
  try {
    await updateUserStatus(Number(req.params.id), "Rejected", reason || null);
    res.json({ message: "User rejected" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error rejecting user", details: error.message });
  }
};

// UPDATE user role
export const changeRole = async (req: Request, res: Response) => {
  const { role } = req.body;
  const validRoles = ["student", "staff", "finance", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  try {
    await updateUserRole(Number(req.params.id), role);
    res.json({ message: "Role updated" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error updating role", details: error.message });
  }
};

// DELETE user
export const removeUser = async (req: Request, res: Response) => {
  try {
    await deleteUser(Number(req.params.id));
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error deleting user", details: error.message });
  }
};
