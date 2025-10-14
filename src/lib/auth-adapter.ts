import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import { db } from "./database";

export function DatabaseAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const newUser = await db.createUser({
        name: user.name || undefined,
        email: user.email,
        emailVerified: user.emailVerified || undefined,
        image: user.image || undefined,
      });
      
      return {
        id: newUser.id as string,
        name: newUser.name as string | null,
        email: newUser.email as string,
        emailVerified: newUser.emailVerified as Date | null,
        image: newUser.image as string | null,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await db.findUserById(id);
      if (!user) return null;
      
      return {
        id: user.id as string,
        name: user.name as string | null,
        email: user.email as string,
        emailVerified: user.emailVerified as Date | null,
        image: user.image as string | null,
      };
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await db.findUserByEmail(email);
      if (!user) return null;
      
      return {
        id: user.id as string,
        name: user.name as string | null,
        email: user.email as string,
        emailVerified: user.emailVerified as Date | null,
        image: user.image as string | null,
      };
    },

    async getUserByAccount({ providerAccountId, provider }): Promise<AdapterUser | null> {
      const account = await db.findAccountByProvider(provider, providerAccountId);
      if (!account) return null;
      
      const user = await db.findUserById(account.userId as string);
      if (!user) return null;
      
      return {
        id: user.id as string,
        name: user.name as string | null,
        email: user.email as string,
        emailVerified: user.emailVerified as Date | null,
        image: user.image as string | null,
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      // For now, we'll implement a simple update - in a real app you'd want more comprehensive updates
      const existingUser = await db.findUserById(user.id);
      if (!existingUser) {
        throw new Error("User not found");
      }
      
      // Return the existing user for now - you can implement updates as needed
      return {
        id: existingUser.id as string,
        name: (user.name ?? existingUser.name) as string | null,
        email: existingUser.email as string,
        emailVerified: (user.emailVerified ?? existingUser.emailVerified) as Date | null,
        image: (user.image ?? existingUser.image) as string | null,
      };
    },

    async deleteUser(_userId: string): Promise<void> {
      // Implementation depends on your needs - for now we'll skip this
      // In a real app, you'd want to handle cascading deletes properly
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const newAccount = await db.createAccount({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
      
      return {
        id: newAccount.id as string,
        userId: newAccount.userId as string,
        type: newAccount.type as "oauth" | "email" | "credentials",
        provider: newAccount.provider as string,
        providerAccountId: newAccount.providerAccountId as string,
        refresh_token: (newAccount.refresh_token ?? undefined) as string | undefined,
        access_token: (newAccount.access_token ?? undefined) as string | undefined,
        expires_at: (newAccount.expires_at ?? undefined) as number | undefined,
        token_type: (newAccount.token_type ?? undefined) as string | undefined,
        scope: (newAccount.scope ?? undefined) as string | undefined,
        id_token: (newAccount.id_token ?? undefined) as string | undefined,
        session_state: (newAccount.session_state ?? undefined) as string | undefined,
      };
    },

    async unlinkAccount({ providerAccountId: _providerAccountId, provider: _provider }: { providerAccountId: string; provider: string }): Promise<void> {
      // Implementation for unlinking accounts
      // For now we'll skip this
    },

    async createSession({ sessionToken, userId, expires }): Promise<AdapterSession> {
      const session = await db.createSession({
        sessionToken,
        userId,
        expires,
      });
      
      return {
        sessionToken: session.sessionToken as string,
        userId: session.userId as string,
        expires: session.expires as Date,
      };
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const session = await db.findSessionByToken(sessionToken);
      if (!session) return null;
      
      const user = await db.findUserById(session.userId as string);
      if (!user) return null;
      
      return {
        session: {
          sessionToken: session.sessionToken as string,
          userId: session.userId as string,
          expires: session.expires as Date,
        },
        user: {
          id: user.id as string,
          name: user.name as string | null,
          email: user.email as string,
          emailVerified: user.emailVerified as Date | null,
          image: user.image as string | null,
        },
      };
    },

    async updateSession({ sessionToken: _sessionToken, expires: _expires }: { sessionToken: string; expires?: Date }): Promise<AdapterSession | null | undefined> {
      // For now, return null to indicate no update needed
      // In a real app, you'd implement session updates
      return null;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await db.deleteSession(sessionToken);
    },

    async createVerificationToken({ identifier, expires, token }): Promise<VerificationToken> {
      // For now, we'll skip verification tokens
      // In a real app, you'd implement this for email verification
      return { identifier, expires, token };
    },

    async useVerificationToken({ identifier: _identifier, token: _token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
      // For now, we'll skip verification tokens
      // In a real app, you'd implement this for email verification
      return null;
    },
  };
}
