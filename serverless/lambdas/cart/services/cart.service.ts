import { ConflictError, NotFoundError } from "../../shared/errors";
import type { Cart } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import { CatalogRepository } from "../../catalog/repositories/catalog.repository";
import { buildCart } from "../mappers";
import { AddCartItemSchema } from "../schemas";
import { CartRepository } from "../repositories/cart.repository";

export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
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

  async removeItem(userId: string, productSlug: string): Promise<void> {
    const raw = await this.cartRepo.getRaw(userId);
    if (!raw[productSlug]) throw new NotFoundError(`Cart item '${productSlug}'`);

    await this.cartRepo.removeItem(userId, productSlug);
    await this.cartRepo.touchTtl(userId);
  }
}
