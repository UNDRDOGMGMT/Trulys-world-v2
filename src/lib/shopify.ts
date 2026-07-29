/**
 * Shopify Storefront API adapter for the boutique.
 *
 * The site is a static SPA, so this talks to Shopify's public Storefront API
 * directly with a *storefront* access token (public by design — it can only read
 * published products and build carts; it is NOT the Admin API key).
 *
 * Zero-config: with no env vars the boutique runs on its bundled demo catalog and
 * the pre-launch reserve flow. Drop the two vars in and the same UI switches to
 * live products and a real Shopify checkout — no component changes.
 *
 *   VITE_SHOPIFY_DOMAIN            trulys-world.myshopify.com
 *   VITE_SHOPIFY_STOREFRONT_TOKEN  the Storefront API access token
 *
 * Products are sorted into the shop's three zones by Shopify TAG — tag a product
 * `zone:racks`, `zone:records` or `zone:counter`. Untagged products fall back to
 * productType, then to the counter.
 */

const DOMAIN = import.meta.env.VITE_SHOPIFY_DOMAIN as string | undefined;
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined;
const API_VERSION = "2024-10";

export const shopifyConfigured = Boolean(DOMAIN && TOKEN);

export type ZoneId = "racks" | "records" | "counter";

export interface Variant {
  id: string;            // gid://shopify/ProductVariant/...
  title: string;         // "M" / "Default Title"
  price: number;
  available: boolean;
}
export interface Product {
  id: string;
  handle: string;
  zone: ZoneId;
  name: string;
  price: number;         // lowest variant price, for the card
  blurb: string;
  image?: string;
  tag?: string;          // "new" / "limited" / "pre-order" — from a `badge:` tag
  variants: Variant[];
}
export interface CartLine { variantId: string; qty: number }

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN as string,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

const zoneFromTags = (tags: string[], productType: string): ZoneId => {
  const z = tags.map((t) => t.toLowerCase()).find((t) => t.startsWith("zone:"))?.slice(5);
  if (z === "racks" || z === "records" || z === "counter") return z;
  const t = productType.toLowerCase();
  if (/tee|shirt|hoodie|jacket|dress|apparel/.test(t)) return "racks";
  if (/vinyl|record|cassette|cd|music|media/.test(t)) return "records";
  return "counter";
};
const badgeFromTags = (tags: string[]) =>
  tags.map((t) => t.toLowerCase()).find((t) => t.startsWith("badge:"))?.slice(6);

const PRODUCTS_QUERY = `
  query Products {
    products(first: 60, sortKey: BEST_SELLING) {
      nodes {
        id handle title description productType tags
        featuredImage { url(transform: {maxWidth: 900}) }
        variants(first: 20) {
          nodes { id title availableForSale price { amount } }
        }
      }
    }
  }`;

interface RawProducts {
  products: {
    nodes: Array<{
      id: string; handle: string; title: string; description: string;
      productType: string; tags: string[];
      featuredImage: { url: string } | null;
      variants: { nodes: Array<{ id: string; title: string; availableForSale: boolean; price: { amount: string } }> };
    }>;
  };
}

/** Live catalog. Throws if Shopify is unreachable — callers fall back to demo. */
export async function fetchProducts(): Promise<Product[]> {
  const data = await gql<RawProducts>(PRODUCTS_QUERY);
  return data.products.nodes.map((p) => {
    const variants: Variant[] = p.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price.amount),
      available: v.availableForSale,
    }));
    return {
      id: p.id,
      handle: p.handle,
      zone: zoneFromTags(p.tags, p.productType),
      name: p.title,
      // description can be long; the card wants one line
      blurb: (p.description || "").split("\n")[0].slice(0, 180),
      price: variants.length ? Math.min(...variants.map((v) => v.price)) : 0,
      image: p.featuredImage?.url,
      tag: badgeFromTags(p.tags),
      variants,
    };
  });
}

const CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart { checkoutUrl }
      userErrors { message }
    }
  }`;

/**
 * Hand the bag to Shopify and get the hosted checkout URL back.
 * The caller navigates to it — payments, tax and shipping stay on Shopify.
 */
export async function createCheckout(lines: CartLine[]): Promise<string> {
  const data = await gql<{
    cartCreate: { cart: { checkoutUrl: string } | null; userErrors: Array<{ message: string }> };
  }>(CART_CREATE, {
    lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.qty })),
  });
  const err = data.cartCreate.userErrors?.[0]?.message;
  if (err) throw new Error(err);
  const url = data.cartCreate.cart?.checkoutUrl;
  if (!url) throw new Error("Shopify returned no checkout URL");
  return url;
}
