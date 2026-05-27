import { v4 as uuidv4 } from "uuid";

import {
  cached,
  CacheKeys,
  TTL,
  type CachedResult,
} from "../../shared/cache";
import { NotFoundError } from "../../shared/errors";
import type { UserDashboard } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import { CreateProfileSchema } from "../schemas";
import { UserRepository } from "../repositories/user.repository";

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  private async fetchDashboard(userId: string): Promise<UserDashboard> {
    const profile = await this.repo.findProfile(userId);
    if (!profile) throw new NotFoundError(`User '${userId}'`);
    const [addresses, payments] = await Promise.all([
      this.repo.findAddresses(userId),
      this.repo.findPayments(userId),
    ]);
    return { profile, addresses, payments };
  }

  async createProfile(body?: string): Promise<{ userId: string }> {
    const { name, email } = parseBody(CreateProfileSchema, body);
    const userId = uuidv4();
    await this.repo.saveProfile(userId, name, email);
    return { userId };
  }

  async getDashboard(userId: string): Promise<CachedResult<UserDashboard>> {
    return cached(CacheKeys.userDashboard(userId), TTL.medium, () =>
      this.fetchDashboard(userId),
    );
  }
}
