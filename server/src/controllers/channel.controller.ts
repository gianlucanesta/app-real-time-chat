import type { Request, Response, NextFunction } from "express";
import * as ChannelModel from "../models/channel.model.js";

/** POST /api/channels */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, avatarUrl, privacy } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(422).json({ error: "Channel name is required" });
      return;
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      res.status(422).json({ error: "Channel description is required" });
      return;
    }
    if (name.trim().length > 100) {
      res.status(422).json({ error: "Channel name must be 100 characters or fewer" });
      return;
    }

    const channel = await ChannelModel.create({
      ownerId: req.user!.sub,
      name: name.trim(),
      description: description.trim(),
      avatarUrl: avatarUrl ?? null,
      privacy: privacy === "private" ? "private" : "public",
    });

    res.status(201).json({ channel });
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const channels = await ChannelModel.listAll(req.user!.sub, search);
    res.status(200).json({ channels });
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/:id */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    const channel = await ChannelModel.findById(channelId, req.user!.sub);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.status(200).json({ channel });
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/follow */
export async function follow(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    const channel = await ChannelModel.findById(channelId, req.user!.sub);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    await ChannelModel.follow(channelId, req.user!.sub);
    res.status(200).json({ followed: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/channels/:id/follow */
export async function unfollowChannel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    await ChannelModel.unfollow(channelId, req.user!.sub);
    res.status(200).json({ unfollowed: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/channels/:id */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    const deleted = await ChannelModel.deleteById(channelId, req.user!.sub);
    if (!deleted) {
      res.status(404).json({ error: "Channel not found or not owned by you" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Channel Messages ─────────────────────────────────────────────

/** GET /api/channels/:id/messages */
export async function listMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;
    const messages = await ChannelModel.listMessages(channelId, limit, before);
    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/messages */
export async function createMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const channelId = req.params.id as string;
    const { content, mediaUrl } = req.body;

    // Only the channel owner can post
    const channel = await ChannelModel.findById(channelId, req.user!.sub);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (channel.owner_id !== req.user!.sub) {
      res.status(403).json({ error: "Only the channel owner can post messages" });
      return;
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(422).json({ error: "Message content is required" });
      return;
    }

    const message = await ChannelModel.createMessage(
      channelId,
      req.user!.sub,
      content,
      mediaUrl ?? null,
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}
