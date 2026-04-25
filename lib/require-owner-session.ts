import { cookies } from "next/headers";
import { BusinessRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken, type SessionClaims } from "@/lib/auth";

export type OwnerSessionUser = {
  id: string;
  email: string;
  fullName: string;
  phoneE164: string;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
};

export type OwnerSessionContext = {
  session: SessionClaims;
  user: OwnerSessionUser;
};

export async function requireOwnerSession(): Promise<
  OwnerSessionContext | { error: ReturnType<typeof jsonError> }
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return { error: jsonError("unauthorized", "Not signed in.", 401) };
  }

  const session = await verifySessionToken(raw);
  if (!session) {
    return { error: jsonError("unauthorized", "Session expired.", 401) };
  }

  if (session.role !== BusinessRole.owner) {
    return { error: jsonError("forbidden", "Only the business owner can do this.", 403) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneE164: true,
      phoneVerifiedAt: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return { error: jsonError("unauthorized", "User not found.", 401) };
  }

  return { session, user };
}
