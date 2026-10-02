import express from "express";
import {
  getUsers,
  getSingleUser,
  approveUser,
  rejectUser,
  changeRole,
  removeUser,
} from "../controllers/userController";
import { createUserByAdmin } from "../controllers/authController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

console.log("✅ userRoutes loaded");

router.use(protect, authorize(["admin"]));

router.get("/", getUsers);
router.get("/:id", getSingleUser);
router.post("/", createUserByAdmin);
router.put("/:id/approve", approveUser);
router.put("/:id/reject", rejectUser);
router.put("/:id/role", changeRole);
router.delete("/:id", removeUser);

export default router;
