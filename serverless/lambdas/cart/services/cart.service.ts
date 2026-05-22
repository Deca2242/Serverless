import { v4 as uuidv4 } from "uuid";

import {
  invalidateCatalogProduct,
  invalidateUserOrders,
} from "../../shared/cache";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import type { Cart } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import { CatalogRepository } from "../../catalog/repositories/catalog.repository";
import { buildCart } from "../mappers";
import {
  AddCartItemSchema,
  CheckoutSchema,
  UpdateCartItemSchema,
} from "../schemas";
import { CartRepository } from "../repositories/cart.repository";
import { CheckoutRepository } from "../repositories/checkout.repository";

export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly checkoutRepo: CheckoutRepository,
    private readonly catalogRepo: CatalogRepository,
  ) {}

  async getCart(userId: string): Promise<Cart> {
    const raw = await this.cartRepo.getRaw(userId);
    return buildCart(userId, raw);
  }

  async addItem(userId: string, body?: string): Promise<Cart> {
    const { productSlug, qty } = parseBody(AddCartItemSchema, body);

    const product = await this.catalogRepo.findProductWithStock(productSlug);
    if (!product) throw new NotFoundError(`Product '${productSlug}'`);

    const raw = await this.cartRepo.getRaw(userId);
    const existingQty = raw[productSlug]?.qty ?? 0;
    const newQty = existingQty + qty;

    if (newQty > product.stockQty) {
      throw new ConflictError(
        `Insufficient stock for '${productSlug}': requested ${newQty}, available ${product.stockQty}`,
      );
    }

    await this.cartRepo.setItem(userId, productSlug, {
      qty: newQty,
      unitPrice: product.price,
      productName: product.name,
    });
    await this.cartRepo.touchTtl(userId);

    return buildCart(userId, await this.cartRepo.getRaw(userId));
  }

  async updateItem(userId: string, productSlug: string, body?: string): Promise<Cart> {
    const { qty } = parseBody(UpdateCartItemSchema, body);

    const raw = await this.cartRepo.getRaw(userId);
    if (!raw[productSlug]) throw new NotFoundError(`Cart item '${productSlug}'`);

    const product = await this.catalogRepo.findProductWithStock(productSlug);
    if (!product) throw new NotFoundError(`Product '${productSlug}'`);

    if (qty > product.stockQty) {
      throw new ConflictError(
        `Insufficient stock for '${productSlug}': requested ${qty}, available ${product.stockQty}`,
      );
    }

    await this.cartRepo.setItem(userId, productSlug, { ...raw[productSlug], qty });
    await this.cartRepo.touchTtl(userId);

    return buildCart(userId, await this.cartRepo.getRaw(userId));
  }

  async removeItem(userId: string, productSlug: string): Promise<void> {
    const raw = await this.cartRepo.getRaw(userId);
    if (!raw[productSlug]) throw new NotFoundError(`Cart item '${productSlug}'`);

    await this.cartRepo.removeItem(userId, productSlug);
    await this.cartRepo.touchTtl(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepo.clear(userId);
  }

  async checkout(
    userId: string,
    body?: string,
  ): Promise<{ orderId: string; total: number; status: string }> {
    const { shippingAddress } = parseBody(CheckoutSchema, body);

    const raw = await this.cartRepo.getRaw(userId);
    const cart = buildCart(userId, raw);
    if (cart.items.length === 0) throw new ValidationError("Cart is empty");

    for (const item of cart.items) {
      const stock = await this.catalogRepo.findProductWithStock(item.productSlug);
      if (!stock || item.qty > stock.stockQty) {
        throw new ConflictError(
          `Insufficient stock for '${item.productSlug}': requested ${item.qty}, available ${stock?.stockQty ?? 0}`,
        );
      }
    }

    const orderId = uuidv4();
    const date = new Date().toISOString();

    try {
      await this.checkoutRepo.createOrderWithStockDecrement({
        orderId,
        userId,
        date,
        shippingAddress,
        items: cart.items,
        total: cart.total,
      });
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === "TransactionCanceledException") {
        throw new ConflictError("Checkout failed: insufficient stock or concurrent update");
      }
      throw err;
    }

    await invalidateUserOrders(userId);
    for (const item of cart.items) {
      const product = await this.catalogRepo.findProductWithStock(item.productSlug);
      if (product) {
        await invalidateCatalogProduct(item.productSlug, product.categorySlug);
      }
    }
    await this.cartRepo.clear(userId);

    return { orderId, total: cart.total, status: "pending" };
  }
}
