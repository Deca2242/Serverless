import { v4 as uuidv4 } from "uuid";

import {
  cached,
  CacheKeys,
  TTL,
  del as cacheDel,
} from "../../shared/cache";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type {
  Address,
  Order,
  Payment,
  User,
  UserDashboard,
} from "../../shared/models";
import { ORDER_STATUSES } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import {
  AddAddressSchema,
  AddPaymentSchema,
  CreateProfileSchema,
} from "../schemas";
import { UserRepository } from "../repositories/user.repository";

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  private async fetchProfile(userId: string): Promise<User> {
    const profile = await this.repo.findProfile(userId);
    if (!profile) throw new NotFoundError(`User '${userId}'`);
    return profile;
  }

  private async fetchDashboard(userId: string): Promise<UserDashboard> {
    const [profile, addresses, payments] = await Promise.all([
      this.fetchProfile(userId),
      this.repo.findAddresses(userId),
      this.repo.findPayments(userId),
    ]);
    return { profile, addresses, payments };
  }

  private async fetchOrders(userId: string, status?: string): Promise<Order[]> {
    if (status) return this.repo.findOrdersByStatus(userId, status);
    return this.repo.findOrders(userId);
  }

  async createProfile(body?: string): Promise<{ userId: string }> {
    const { name, email } = parseBody(CreateProfileSchema, body);
    const userId = uuidv4();
    await this.repo.saveProfile(userId, name, email);
    return { userId };
  }

  async getProfile(userId: string): Promise<User> {
    return cached(CacheKeys.userProfile(userId), TTL.medium, () =>
      this.fetchProfile(userId),
    );
  }

  async getDashboard(userId: string): Promise<UserDashboard> {
    return cached(CacheKeys.userDashboard(userId), TTL.medium, () =>
      this.fetchDashboard(userId),
    );
  }

  async listAddresses(userId: string): Promise<Address[]> {
    return cached(CacheKeys.userAddresses(userId), TTL.medium, () =>
      this.repo.findAddresses(userId),
    );
  }

  async addAddress(userId: string, body?: string): Promise<{ addressId: string }> {
    const input = parseBody(AddAddressSchema, body);
    const addressId = input.addressId ?? uuidv4();

    await this.repo.saveAddress(userId, addressId, input.street, input.city);

    await Promise.all([
      cacheDel(CacheKeys.userAddresses(userId)),
      cacheDel(CacheKeys.userDashboard(userId)),
    ]);

    return { addressId };
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.repo.deleteAddress(userId, addressId);

    await Promise.all([
      cacheDel(CacheKeys.userAddresses(userId)),
      cacheDel(CacheKeys.userDashboard(userId)),
    ]);
  }

  async listPayments(userId: string): Promise<Payment[]> {
    return cached(CacheKeys.userPayments(userId), TTL.medium, () =>
      this.repo.findPayments(userId),
    );
  }

  async addPayment(userId: string, body?: string): Promise<{ paymentId: string }> {
    const { type, last4 } = parseBody(AddPaymentSchema, body);
    const paymentId = uuidv4();

    await this.repo.savePayment(userId, paymentId, type, last4);

    await Promise.all([
      cacheDel(CacheKeys.userPayments(userId)),
      cacheDel(CacheKeys.userDashboard(userId)),
    ]);

    return { paymentId };
  }

  async deletePayment(userId: string, paymentId: string): Promise<void> {
    await this.repo.deletePayment(userId, paymentId);

    await Promise.all([
      cacheDel(CacheKeys.userPayments(userId)),
      cacheDel(CacheKeys.userDashboard(userId)),
    ]);
  }

  async listOrders(userId: string, status?: string): Promise<Order[]> {
    if (status && !ORDER_STATUSES.includes(status as Order["status"])) {
      throw new ValidationError(`Invalid status '${status}'`);
    }
    const key = status
      ? CacheKeys.userOrdersByStatus(userId, status)
      : CacheKeys.userOrders(userId);
    return cached(key, TTL.short, () => this.fetchOrders(userId, status));
  }
}
