import type { Request, Response, NextFunction } from "express";
import type { UpdateUserBody } from "../interfaces/api.interface.js";
import * as UserModel from "../models/user.model.js";
import { Message } from "../models/message.model.js";

/** GET /api/users/me */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.sub);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/search?q=<query> */
export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query.q as string | undefined;
    if (!q || q.trim().length < 2) {
      res
        .status(422)
        .json({ error: 'Query parameter "q" must be at least 2 characters' });
      return;
    }
    const users = await UserModel.search(q.trim(), 20, req.user!.sub);
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/:id */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.params.id;

    if (req.user!.sub !== userId) {
      res.status(403).json({ error: "Cannot update another user's profile" });
      return;
    }

    const body = req.body as UpdateUserBody;

    // Map camelCase client fields → snake_case DB columns
    const allowed: Record<string, string> = {
      displayName: "display_name",
      firstName: "first_name",
      lastName: "last_name",
      phone: "phone",
      role: "role",
      avatarUrl: "avatar_url",
      initials: "initials",
      avatarGradient: "avatar_gradient",
    };

    const fields: Record<string, string> = {};
    for (const [clientKey, dbCol] of Object.entries(allowed)) {
      const value = body[clientKey as keyof UpdateUserBody];
      if (value !== undefined) fields[dbCol] = value;
    }

    if (!Object.keys(fields).length) {
      res.status(422).json({ error: "No updatable fields provided" });
      return;
    }

    const user = await UserModel.update(userId, fields);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Broadcast profile changes to all conversation partners via socket
    const io = req.app.get("io");
    if (io) {
      const safeId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const convIds: string[] = await Message.distinct("conversationId", {
        conversationId: { $regex: safeId },
        expires_at: { $gt: new Date() },
      });
      const partnerIds = new Set<string>();
      for (const cid of convIds) {
        for (const p of cid.split("___")) {
          if (p !== userId) partnerIds.add(p);
        }
      }
      if (partnerIds.size > 0) {
        const payload = {
          userId,
          displayName: user.display_name,
          initials: user.initials,
          avatarGradient:
            user.avatar_gradient || "linear-gradient(135deg,#2563EB,#7C3AED)",
          avatarUrl: user.avatar_url || null,
        };
        for (const pid of partnerIds) {
          io.to("user:" + pid).emit("user:profile-updated", payload);
        }
      }
    }

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/lookup-phone?phone=<full_number> */
export async function lookupPhone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const phone = req.query.phone as string | undefined;
    if (!phone || phone.trim().length < 4) {
      res.status(422).json({ error: '"phone" query param is required' });
      return;
    }
    const user = await UserModel.findByPhone(phone.trim());
    if (!user) {
      res.status(200).json({ found: false });
      return;
    }
    res.status(200).json({ found: true, user });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/me/settings */
export async function getSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await UserModel.getSettings(req.user!.sub);
    res.status(200).json({ settings });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me/settings */
export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partial = req.body as Record<string, unknown>;
    if (!partial || typeof partial !== "object" || Array.isArray(partial)) {
      res.status(422).json({ error: "Body must be a JSON object" });
      return;
    }
    const settings = await UserModel.updateSettings(req.user!.sub, partial);
    res.status(200).json({ settings });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/blocked */
export async function listBlocked(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const blocked = await UserModel.listBlockedUsers(req.user!.sub);
    res.status(200).json({ blocked });
  } catch (err) {
    next(err);
  }
}

/** POST /api/users/block */
export async function blockUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId || typeof userId !== "string") {
      res.status(422).json({ error: "userId is required" });
      return;
    }
    if (userId === req.user!.sub) {
      res.status(422).json({ error: "Cannot block yourself" });
      return;
    }
    const target = await UserModel.findById(userId);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const blocked = await UserModel.blockUser(req.user!.sub, userId);
    if (!blocked) {
      res.status(200).json({ message: "User already blocked" });
      return;
    }
    res.status(201).json({ blocked });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/users/block/:userId */
export async function unblockUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const blockedId = req.params.userId as string;
    if (!blockedId) {
      res.status(400).json({ error: "userId param is required" });
      return;
    }
    const removed = await UserModel.unblockUser(req.user!.sub, blockedId);
    if (!removed) {
      res.status(404).json({ error: "Block entry not found" });
      return;
    }
    res.status(200).json({ unblocked: true });
  } catch (err) {
    next(err);
  }
}
