import type { Request, Response, NextFunction } from "express";
import * as CommunityModel from "../models/community.model.js";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2048;
const MAX_CONTENT_LENGTH = 4096;
const MAX_MEMBERS = 2000;

// ── Community CRUD ──────────────────────────────────────────────────────

/** GET /api/communities */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communities = await CommunityModel.listByUser(req.user!.sub);
    res.status(200).json({ communities });
  } catch (err) {
    next(err);
  }
}

/** POST /api/communities */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, iconUrl } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(422).json({ error: "Community name is required" });
      return;
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      res
        .status(422)
        .json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` });
      return;
    }
    if (
      description &&
      typeof description === "string" &&
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      res.status(422).json({ error: "Description is too long" });
      return;
    }

    const community = await CommunityModel.create({
      name: name.trim(),
      description: (description || "").trim(),
      iconUrl: iconUrl ?? null,
      createdBy: req.user!.sub,
    });

    // Emit via socket to the creator
    const io = req.app.get("io");
    if (io) {
      io.to("user:" + req.user!.sub).emit("community:created", { community });
    }

    res.status(201).json({ community });
  } catch (err) {
    next(err);
  }
}

/** GET /api/communities/:id */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const community = await CommunityModel.findById(
      req.params.id as string,
      req.user!.sub,
    );
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }
    res.status(200).json({ community });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/communities/:id */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can update community info" });
      return;
    }

    const { name, description, iconUrl } = req.body;
    const fields: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(422).json({ error: "Community name is required" });
        return;
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        res
          .status(422)
          .json({
            error: `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
          });
        return;
      }
      fields.name = name.trim();
    }
    if (description !== undefined)
      fields.description = (description || "").trim();
    if (iconUrl !== undefined) fields.icon_url = iconUrl;

    const community = await CommunityModel.update(communityId, fields as any);
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }

    const io = req.app.get("io");
    if (io) {
      io.to("community:" + communityId).emit("community:updated", {
        community,
      });
    }

    res.status(200).json({ community });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/communities/:id */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const deleted = await CommunityModel.deleteById(
      req.params.id as string,
      req.user!.sub,
    );
    if (!deleted) {
      res
        .status(404)
        .json({ error: "Community not found or not owned by you" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Members ─────────────────────────────────────────────────────────────

/** GET /api/communities/:id/members */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const member = await CommunityModel.isMember(communityId, req.user!.sub);
    if (!member) {
      res.status(403).json({ error: "Not a member of this community" });
      return;
    }
    const members = await CommunityModel.listMembers(communityId);
    res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
}

/** POST /api/communities/:id/members */
export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can add members" });
      return;
    }

    const { userId } = req.body;
    if (!userId || typeof userId !== "string") {
      res.status(422).json({ error: "userId is required" });
      return;
    }

    // Check community member limit
    const community = await CommunityModel.findById(communityId, req.user!.sub);
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }
    if (community.member_count >= MAX_MEMBERS) {
      res
        .status(422)
        .json({ error: `Community is full (max ${MAX_MEMBERS} members)` });
      return;
    }

    const added = await CommunityModel.addMember(communityId, userId);
    if (!added) {
      res.status(409).json({ error: "User is already a member" });
      return;
    }

    const io = req.app.get("io");
    if (io) {
      io.to("community:" + communityId).emit("community:memberJoined", {
        communityId,
        userId,
      });
    }

    res.status(200).json({ added: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/communities/:id/members/:userId */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const isSelf = targetUserId === req.user!.sub;

    if (!isSelf) {
      const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
      if (!isAdm) {
        res.status(403).json({ error: "Only admins can remove members" });
        return;
      }
    }

    const removed = await CommunityModel.removeMember(
      communityId,
      targetUserId,
    );
    if (!removed) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const io = req.app.get("io");
    if (io) {
      io.to("community:" + communityId).emit("community:memberLeft", {
        communityId,
        userId: targetUserId,
      });
    }

    res.status(200).json({ removed: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/communities/:id/members/:userId */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can change roles" });
      return;
    }

    const { role } = req.body;
    if (role !== "admin" && role !== "member") {
      res.status(422).json({ error: "role must be 'admin' or 'member'" });
      return;
    }

    const updated = await CommunityModel.updateMemberRole(
      communityId,
      req.params.userId as string,
      role,
    );
    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    res.status(200).json({ updated: true });
  } catch (err) {
    next(err);
  }
}

// ── Groups ──────────────────────────────────────────────────────────────

/** GET /api/communities/:id/groups */
export async function listGroups(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const member = await CommunityModel.isMember(communityId, req.user!.sub);
    if (!member) {
      res.status(403).json({ error: "Not a member of this community" });
      return;
    }
    const groups = await CommunityModel.listGroups(communityId);
    res.status(200).json({ groups });
  } catch (err) {
    next(err);
  }
}

/** POST /api/communities/:id/groups */
export async function createGroup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can create groups" });
      return;
    }

    const { name, description, iconUrl } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(422).json({ error: "Group name is required" });
      return;
    }

    const group = await CommunityModel.createGroup(
      communityId,
      name.trim(),
      (description || "").trim(),
      req.user!.sub,
      iconUrl ?? null,
    );

    const io = req.app.get("io");
    if (io) {
      io.to("community:" + communityId).emit("community:groupAdded", {
        communityId,
        group,
      });
    }

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/communities/:id/groups/:groupId */
export async function removeGroup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can remove groups" });
      return;
    }

    const deleted = await CommunityModel.deleteGroup(
      req.params.groupId as string,
      communityId,
    );
    if (!deleted) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Announcements ───────────────────────────────────────────────────────

/** GET /api/communities/:id/announcements */
export async function listAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const member = await CommunityModel.isMember(communityId, req.user!.sub);
    if (!member) {
      res.status(403).json({ error: "Not a member of this community" });
      return;
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const announcements = await CommunityModel.listAnnouncements(
      communityId,
      limit,
      offset,
    );
    res.status(200).json({ announcements });
  } catch (err) {
    next(err);
  }
}

/** POST /api/communities/:id/announcements */
export async function createAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can post announcements" });
      return;
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(422).json({ error: "Announcement content is required" });
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      res
        .status(422)
        .json({ error: `Content exceeds ${MAX_CONTENT_LENGTH} characters` });
      return;
    }

    const announcement = await CommunityModel.createAnnouncement(
      communityId,
      req.user!.sub,
      content.trim(),
    );

    const io = req.app.get("io");
    if (io) {
      io.to("community:" + communityId).emit("community:announcement", {
        communityId,
        announcement,
      });
    }

    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/communities/:id/announcements/:announcementId */
export async function removeAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const communityId = req.params.id as string;
    const isAdm = await CommunityModel.isAdmin(communityId, req.user!.sub);
    if (!isAdm) {
      res.status(403).json({ error: "Only admins can delete announcements" });
      return;
    }

    const deleted = await CommunityModel.deleteAnnouncement(
      req.params.announcementId as string,
      communityId,
    );
    if (!deleted) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}
