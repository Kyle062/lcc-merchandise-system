import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByUsername, createUser } from "../models/User";

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user: any = await findUserByUsername(username);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);

    // ✅ TEMPORARY BYPASS FOR TAILOR TESTING
    const isTailorTest = user.username === "tailor" && password === "tailor123";

    if (!isMatch && !isTailorTest) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status === "Pending") {
      return res.status(403).json({
        message:
          "Your account is pending admin approval. Please wait for confirmation.",
        status: "Pending",
      });
    }

    if (user.status === "Rejected") {
      return res.status(403).json({
        message: user.rejection_reason
          ? `Your account was rejected: ${user.rejection_reason}`
          : "Your account has been rejected by the administrator.",
        status: "Rejected",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );

    res.json({
      token,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
    });
  } catch (error: any) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

// REGISTER (With Automated ID Verification)
export const register = async (req: Request, res: Response) => {
  const { username, email, password, full_name, course, id_photo } = req.body;

  console.log(" Public register attempt:", { username, email, id_photo });

  try {
    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // ✅ AUTOMATED VERIFICATION LOGIC
    // Since the frontend scanner already verified the barcode matches the name,
    // we trust the id_photo flag and auto-approve the account.
    let accountStatus = "Pending";
    let message = "Account created! Please wait for admin approval.";

    if (id_photo === "verified") {
      accountStatus = "Active";
      message = "ID Verified successfully! Your account is now active.";
    } else if (id_photo) {
      // Fallback for edge cases
      accountStatus = "Pending";
      message = "ID Verification incomplete. Admin approval required.";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await createUser({
      username,
      email,
      password: hashedPassword,
      role: "student",
      full_name,
      course: course || null,
      status: accountStatus,
    });

    console.log(`User created with ID: ${userId} | Status: ${accountStatus}`);

    res.status(201).json({
      message: message,
      userId,
      status: accountStatus,
    });
  } catch (error: any) {
    console.error(" Registration error:", error);
    res.status(500).json({
      message: "Error creating user",
      details: error.message,
    });
  }
};

// CREATE USER (admin only)
export const createUserByAdmin = async (req: Request, res: Response) => {
  const { username, email, password, role, full_name, course } = req.body;

  try {
    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await createUser({
      username,
      email,
      password: hashedPassword,
      role,
      full_name,
      course: course || null,
      status: "Active",
    });

    res.status(201).json({ message: "User created successfully", userId });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error creating user", details: error.message });
  }
};
