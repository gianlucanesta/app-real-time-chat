import type { Request, Response, NextFunction } from "express";
import type { CreateContactBody } from "../interfaces/api.interface.js";
import * as ContactModel from "../models/contact.model.js";
import * as UserModel from "../models/user.model.js";

/** POST /api/contacts */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { displayName, phone, initials, gradient } =
      req.body as CreateContactBody;

    if (
      !displayName ||
      typeof displayName !== "string" ||
      !displayName.trim()
    ) {
      res.status(422).json({ error: "displayName is required" });
      return;
    }

    // Try to find a matching registered user by phone
    let linkedUserId: string | null = null;
    if (phone) {
      try {
        const found = await UserModel.findByPhone(phone.trim());
        if (found) linkedUserId = found.id;
      } catch {
        // non-critical — proceed without linking
      }
    }

    const contact = await ContactModel.upsert({
      ownerId: req.user!.sub,
      displayName: displayName.trim(),
      phone: phone?.trim() ?? "",
      initials: initials?.trim() ?? "",
      gradient: gradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)",
      linkedUserId,
    });

    // Enrich with linked user's registered profile
    if (linkedUserId) {
      try {
        const linkedUser = await UserModel.findById(linkedUserId);
        if (linkedUser) {
          (contact as any).linked_display_name = linkedUser.display_name;
          (contact as any).linked_initials = linkedUser.initials;
        }
      } catch {
        /* non-critical */
      }
    }

    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
}

/** GET /api/contacts */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contacts = await ContactModel.listByOwner(req.user!.sub);
    res.status(200).json({ contacts });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/contacts/:id */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contactId = req.params.id as string;
    if (!contactId) {
      res.status(400).json({ error: "contact id is required" });
      return;
    }
    const deleted = await ContactModel.deleteById(contactId, req.user!.sub);
    if (!deleted) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}
