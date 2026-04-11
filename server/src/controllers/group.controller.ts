import type { Request, Response, NextFunction } from "express";
import * as GroupModel from "../models/group.model.js";
import { Message } from "../models/message.model.js";

const MAX_NAME_LENGTH = 100;
const MAX_MEMBERS = 256;

/** POST /api/groups — create a new group chat */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, memberIds } = req.body as {
      name?: string;
      memberIds?: string[];
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(422).json({ error: "Group name is required" });
      return;
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      res
        .status(422)
        .json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` });
      return;
    }
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(422).json({ error: "At least one member is required" });
      return;
    }
    if (memberIds.length > MAX_MEMBERS) {
      res
        .status(422)
        .json({ error: `Group cannot have more than ${MAX_MEMBERS} members` });
      return;
    }

    const group = await GroupModel.create(
      name.trim(),
      req.user!.sub,
      memberIds,
    );

    console.log("[group.create] Created group:", {
      id: group.id,
      name: group.name,
      createdBy: req.user!.sub,
      members: group.member_ids,
    });

    // Emit socket event so all members see the new group immediately
    const io = req.app.get("io");
    if (io) {
      const conversationId = `grp_${group.id}`;
      for (const uid of group.member_ids) {
        io.to("user:" + uid).emit("group:created" as any, {
          conversationId,
          group,
        });
      }
      console.log(
        "[group.create] Emitted group:created to",
        group.member_ids.length,
        "members",
      );
    } else {
      console.warn(
        "[group.create] Socket.io instance not available — skipped real-time emit",
      );
    }

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
}

/** GET /api/groups — list all group chats the current user belongs to */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const groups = await GroupModel.listForUser(userId);

    const conversations = await Promise.all(
      groups.map(async (g) => {
        const conversationId = `grp_${g.id}`;

        const [lastMsg, unreadCount] = await Promise.all([
          Message.findOne(
            { conversationId, expires_at: { $gt: new Date() } },
            {
              text: 1,
              createdAt: 1,
              sender: 1,
              status: 1,
              mediaType: 1,
              mediaDuration: 1,
            },
          )
            .sort({ createdAt: -1 })
            .lean(),
          Message.countDocuments({
            conversationId,
            sender: { $ne: userId },
            status: { $ne: "read" },
            expires_at: { $gt: new Date() },
          }),
        ]);

        const msgDoc = lastMsg as {
          _id: { toString(): string };
          text: string;
          createdAt: Date;
          sender: string;
          status: string;
          mediaType?: "image" | "video" | "audio" | null;
          mediaDuration?: number | null;
        } | null;

        const lastMessageIsMine = msgDoc ? msgDoc.sender === userId : false;

        return {
          id: conversationId,
          type: "group" as const,
          name: g.name,
          gradient: g.gradient,
          initials: g.initials,
          avatar: g.icon_url ?? undefined,
          lastMessage: msgDoc
            ? lastMessageIsMine
              ? `You: ${msgDoc.text}`
              : msgDoc.text
            : "",
          lastMessageTime: msgDoc ? msgDoc.createdAt.toISOString() : "",
          lastMessageId: msgDoc ? msgDoc._id.toString() : undefined,
          lastMessageIsMine,
          lastMessageStatus: msgDoc ? msgDoc.status : undefined,
          lastMediaType: msgDoc?.mediaType || null,
          lastMediaDuration: msgDoc?.mediaDuration || null,
          unreadCount,
          isOnline: false,
          participants: g.member_ids,
        };
      }),
    );

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

/** GET /api/groups/:id — get group info with members */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const group = await GroupModel.getById(id);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Verify the requesting user is a member
    const role = await GroupModel.getMemberRole(id, userId);
    if (!role) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }

    const members = await GroupModel.getMembers(id);

    res.json({ group, members, myRole: role });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/groups/:id — update group info (admin only) */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const role = await GroupModel.getMemberRole(id, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Only admins can edit group info" });
      return;
    }

    const { name, description, icon_url } = req.body as {
      name?: string;
      description?: string;
      icon_url?: string | null;
    };

    if (
      name !== undefined &&
      (!name.trim() || name.trim().length > MAX_NAME_LENGTH)
    ) {
      res.status(422).json({ error: "Invalid group name" });
      return;
    }

    const updated = await GroupModel.updateGroup(id, {
      name,
      description,
      icon_url,
    });
    if (!updated) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Emit update to all members
    const io = req.app.get("io");
    if (io) {
      const members = await GroupModel.getMembers(id);
      const conversationId = `grp_${id}`;
      for (const m of members) {
        io.to("user:" + m.user_id).emit("group:updated" as any, {
          conversationId,
          group: updated,
        });
      }
    }

    res.json({ group: updated });
  } catch (err) {
    next(err);
  }
}

/** POST /api/groups/:id/members — add members (admin only) */
export async function addMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const role = await GroupModel.getMemberRole(id, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Only admins can add members" });
      return;
    }

    const { memberIds } = req.body as { memberIds?: string[] };
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(422).json({ error: "memberIds array is required" });
      return;
    }

    await Promise.all(memberIds.map((uid) => GroupModel.addMember(id, uid)));

    const members = await GroupModel.getMembers(id);
    res.json({ members });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/groups/:id/members/:userId — remove a member (admin only, or self-leave) */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const targetId = req.params.userId as string;
    const requesterId = req.user!.sub;

    // Allow self-leave or admin removal
    if (targetId !== requesterId) {
      const role = await GroupModel.getMemberRole(id, requesterId);
      if (role !== "admin") {
        res.status(403).json({ error: "Only admins can remove members" });
        return;
      }
    }

    await GroupModel.removeMember(id, targetId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/groups/:id/members/:userId/role — change member role (admin only) */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const targetId = req.params.userId as string;
    const requesterId = req.user!.sub;

    const requesterRole = await GroupModel.getMemberRole(id, requesterId);
    if (requesterRole !== "admin") {
      res.status(403).json({ error: "Only admins can change roles" });
      return;
    }

    const { role } = req.body as { role?: string };
    if (role !== "admin" && role !== "member") {
      res.status(422).json({ error: "Role must be 'admin' or 'member'" });
      return;
    }

    await GroupModel.updateMemberRole(id, targetId, role);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/groups/:id — leave or delete a group */
export async function deleteGroup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    // Verify the user is actually a member
    const role = await GroupModel.getMemberRole(id, userId);
    if (!role) {
      res
        .status(404)
        .json({ error: "Group not found or you are not a member" });
      return;
    }

    const conversationId = `grp_${id}`;

    if (role === "admin") {
      // Admin: delete all messages + the entire group
      await Message.deleteMany({ conversationId });
      await GroupModel.deleteGroup(id);
    } else {
      // Non-admin: just leave — remove membership, keep group for others
      await GroupModel.removeMember(id, userId);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
