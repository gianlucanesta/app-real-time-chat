import type { Request, Response, NextFunction } from "express";
import type { UpdateUserBody } from "../interfaces/api.interface.js";
import * as UserModel from "../models/user.model.js";

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
    const users = await UserModel.search(q.trim());
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
      res
        .status(403)
        .json({ error: "Cannot update another user's profile" });
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
