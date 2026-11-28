import { Request, Response } from "express";
import {
  findUsernameOwner,
  getUserProfileById,
  updateUserProfile,
  type ProfileUpdate,
} from "../models/User";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/;

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidImage = (value: string) => {
  const match = IMAGE_DATA_URL.exec(value);
  if (!match) return false;
  const bytes = Math.floor((match[2].length * 3) / 4);
  return bytes <= MAX_IMAGE_BYTES;
};

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.id);
    const user = await getUserProfileById(userId);

    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json(user);
  } catch (error: any) {
    console.error("getMyProfile error:", error.message);
    return res
      .status(500)
      .json({ message: "Error fetching profile", details: error.message });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.id);
    const current = await getUserProfileById(userId);

    if (!current) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const username = text(req.body.username);
    const email = text(req.body.email);

    // Full name and course are registrar-managed. Any client-supplied values
    // are ignored so students cannot change them through this endpoint.
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        message: "Username must be between 3 and 50 characters.",
      });
    }

    if (!isValidEmail(email) || email.length > 150) {
      return res
        .status(400)
        .json({ message: "Enter a valid email address." });
    }

    const usernameOwner = await findUsernameOwner(username, userId);
    if (usernameOwner) {
      return res.status(400).json({ message: "Username already exists" });
    }

    let profilePicture: string | null = current.profile_picture || null;
    if (Object.prototype.hasOwnProperty.call(req.body, "profile_picture")) {
      const requestedPicture = req.body.profile_picture;

      if (requestedPicture === null || requestedPicture === "") {
        profilePicture = null;
      } else if (
        typeof requestedPicture !== "string" ||
        !isValidImage(requestedPicture)
      ) {
        return res.status(400).json({
          message: "Profile picture must be a PNG, JPG, WEBP or GIF under 5 MB.",
        });
      } else {
        profilePicture = requestedPicture;
      }
    }

    const update: ProfileUpdate = {
      username,
      email,
      profile_picture: profilePicture,
    };

    const user = await updateUserProfile(userId, update);

    return res.json({
      message: "Profile updated successfully.",
      user,
    });
  } catch (error: any) {
    console.error("updateMyProfile error:", error.message);
    return res
      .status(500)
      .json({ message: "Error updating profile", details: error.message });
  }
};
