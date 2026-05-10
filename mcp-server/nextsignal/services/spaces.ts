import { and, asc, eq, inArray } from "drizzle-orm";
import { homeSpaceMembers, homeSpaces, homeUsers } from "@/nextsignal/db/schema";
import type { ActiveHomeSpace, HomeSpace, HomeSpaceMember } from "@/nextsignal/domain/home";
import { getDb } from "@/nextsignal/services/database";
import { usersService } from "@/nextsignal/services/users";

export type SpaceSummary = HomeSpace & {
  role: HomeSpaceMember["role"];
  memberCount: number;
  isActive: boolean;
};

export type SpaceDetails = SpaceSummary & {
  members: HomeSpaceMember[];
};

export const spacesService = {
  async create(input: { userId: string; name: string }): Promise<SpaceDetails> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const inviteCode = await createUniqueInviteCode();
    const name = input.name.trim();

    const [space] = await db
      .insert(homeSpaces)
      .values({
        id,
        name,
        inviteCode,
        createdByUserId: input.userId
      })
      .returning();

    await db.insert(homeSpaceMembers).values({
      spaceId: id,
      userId: input.userId,
      role: "owner"
    });
    await usersService.setActiveSpace(input.userId, id);

    return this.getDetails(input.userId, id);
  },

  async joinByCode(input: { userId: string; code: string }): Promise<SpaceDetails | null> {
    const db = await getDb();
    const code = normalizeInviteCode(input.code);
    const [space] = await db
      .select()
      .from(homeSpaces)
      .where(eq(homeSpaces.inviteCode, code))
      .limit(1);

    if (!space) return null;

    await db
      .insert(homeSpaceMembers)
      .values({
        spaceId: space.id,
        userId: input.userId,
        role: "member"
      })
      .onConflictDoNothing();
    await usersService.setActiveSpace(input.userId, space.id);

    return this.getDetails(input.userId, space.id);
  },

  async select(input: { userId: string; spaceId: string }): Promise<SpaceDetails | null> {
    const membership = await this.getMembership(input.userId, input.spaceId);
    if (!membership) return null;

    await usersService.setActiveSpace(input.userId, input.spaceId);
    return this.getDetails(input.userId, input.spaceId);
  },

  async listForUser(userId: string): Promise<SpaceSummary[]> {
    const db = await getDb();
    const user = await usersService.get(userId);
    const rows = await db
      .select({
        space: homeSpaces,
        member: homeSpaceMembers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeSpaces, eq(homeSpaces.id, homeSpaceMembers.spaceId))
      .where(eq(homeSpaceMembers.userId, userId))
      .orderBy(asc(homeSpaces.createdAt));

    if (rows.length === 0) return [];

    const memberCounts = await this.countMembers(rows.map((row) => row.space.id));
    return rows.map((row) => ({
      ...mapHomeSpace(row.space),
      role: row.member.role,
      memberCount: memberCounts.get(row.space.id) ?? 1,
      isActive: user?.activeSpaceId === row.space.id
    }));
  },

  async getDetails(userId: string, spaceId: string): Promise<SpaceDetails> {
    const spaces = await this.listForUser(userId);
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      throw new Error("Space membership disappeared while loading details.");
    }

    return {
      ...space,
      members: await this.listMembers(spaceId)
    };
  },

  async getActiveForUser(userId: string): Promise<ActiveHomeSpace | null> {
    const user = await usersService.get(userId);
    if (!user) return null;

    const activeMembership = user.activeSpaceId
      ? await this.getMembership(userId, user.activeSpaceId)
      : null;
    const membership = activeMembership ?? await this.getFirstMembership(userId);
    if (!membership) return null;

    const activeUser = user.activeSpaceId === membership.spaceId
      ? user
      : await usersService.setActiveSpace(userId, membership.spaceId);

    const db = await getDb();
    const [space] = await db
      .select()
      .from(homeSpaces)
      .where(eq(homeSpaces.id, membership.spaceId))
      .limit(1);

    if (!space) return null;

    return {
      user: activeUser,
      space: mapHomeSpace(space),
      membership
    };
  },

  async listMembers(spaceId: string): Promise<HomeSpaceMember[]> {
    const db = await getDb();
    const rows = await db
      .select({
        member: homeSpaceMembers,
        user: homeUsers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeUsers, eq(homeUsers.id, homeSpaceMembers.userId))
      .where(eq(homeSpaceMembers.spaceId, spaceId))
      .orderBy(asc(homeSpaceMembers.joinedAt));

    return rows.map((row) => mapHomeSpaceMember(row.member, row.user));
  },

  async listNotificationMembers(input: { spaceId: string; excludeUserId: string }): Promise<HomeSpaceMember[]> {
    const members = await this.listMembers(input.spaceId);
    return members.filter((member) => member.userId !== input.excludeUserId && member.email);
  },

  async getMembership(userId: string, spaceId: string): Promise<HomeSpaceMember | null> {
    const db = await getDb();
    const [row] = await db
      .select({
        member: homeSpaceMembers,
        user: homeUsers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeUsers, eq(homeUsers.id, homeSpaceMembers.userId))
      .where(and(eq(homeSpaceMembers.userId, userId), eq(homeSpaceMembers.spaceId, spaceId)))
      .limit(1);

    return row ? mapHomeSpaceMember(row.member, row.user) : null;
  },

  async getFirstMembership(userId: string): Promise<HomeSpaceMember | null> {
    const db = await getDb();
    const [row] = await db
      .select({
        member: homeSpaceMembers,
        user: homeUsers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeUsers, eq(homeUsers.id, homeSpaceMembers.userId))
      .where(eq(homeSpaceMembers.userId, userId))
      .orderBy(asc(homeSpaceMembers.joinedAt))
      .limit(1);

    return row ? mapHomeSpaceMember(row.member, row.user) : null;
  },

  async countMembers(spaceIds: string[]): Promise<Map<string, number>> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(homeSpaceMembers)
      .where(inArray(homeSpaceMembers.spaceId, spaceIds));
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.spaceId, (counts.get(row.spaceId) ?? 0) + 1);
    }

    return counts;
  }
};

async function createUniqueInviteCode() {
  const db = await getDb();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const [existing] = await db
      .select({ id: homeSpaces.id })
      .from(homeSpaces)
      .where(eq(homeSpaces.inviteCode, code))
      .limit(1);

    if (!existing) return code;
  }

  throw new Error("Unable to generate a unique space invite code.");
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replaceAll("-", "").replaceAll(" ", "");
}

function mapHomeSpace(row: typeof homeSpaces.$inferSelect): HomeSpace {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.inviteCode,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString()
  };
}

function mapHomeSpaceMember(
  member: typeof homeSpaceMembers.$inferSelect,
  user: typeof homeUsers.$inferSelect
): HomeSpaceMember {
  return {
    spaceId: member.spaceId,
    userId: member.userId,
    role: member.role,
    email: user.email,
    displayName: user.displayName,
    joinedAt: member.joinedAt.toISOString()
  };
}
