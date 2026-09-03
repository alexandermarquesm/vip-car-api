import crypto from "crypto";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { ITenantRepository } from "../../repositories/ITenantRepository";

type PlanVariant = "basic" | "pro";

interface GoogleSubscriptionLineItem {
  productId?: string;
  expiryTime?: string;
  latestSuccessfulOrderId?: string;
}

interface GoogleSubscriptionPurchase {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: {
    obfuscatedExternalAccountId?: string;
  };
  lineItems?: GoogleSubscriptionLineItem[];
}

interface GooglePlayConfig {
  packageName: string;
  basicProductId: string;
  proProductId: string;
  serviceAccountJson?: string;
  serviceAccountBase64?: string;
  pubsubAudience?: string;
  pubsubServiceAccountEmail?: string;
}

export class GooglePlayBillingError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
  }
}

export class GooglePlayBilling {
  private readonly auth: GoogleAuth;
  private readonly oidcClient = new OAuth2Client();

  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly config: GooglePlayConfig,
  ) {
    const credentials = this.parseCredentials();
    this.auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
  }

  static hash(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  getProductIds(): Record<PlanVariant, string> {
    return {
      basic: this.config.basicProductId,
      pro: this.config.proProductId,
    };
  }

  async verifyForTenant(input: {
    tenantId: string;
    userId: string;
    role: string;
    productId: string;
    purchaseToken: string;
  }): Promise<{ variantId: PlanVariant; currentPeriodEnd: Date }> {
    if (input.role !== "owner") {
      throw new GooglePlayBillingError("Apenas o proprietário pode contratar um plano.", 403);
    }
    if (!/^[A-Za-z0-9._-]{3,200}$/.test(input.productId)) {
      throw new GooglePlayBillingError("Produto inválido.");
    }
    if (!input.purchaseToken || input.purchaseToken.length > 4096) {
      throw new GooglePlayBillingError("Token de compra inválido.");
    }

    const variantId = this.variantForProduct(input.productId);
    const purchase = await this.getSubscription(input.purchaseToken);
    const lineItem = this.getPurchasedLineItem(purchase, input.productId);
    const expectedAccountId = GooglePlayBilling.hash(input.userId);
    const receivedAccountId =
      purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;

    if (!receivedAccountId || receivedAccountId !== expectedAccountId) {
      throw new GooglePlayBillingError(
        "A compra não pertence a esta conta do Viper Car.",
        403,
      );
    }

    const tokenHash = GooglePlayBilling.hash(input.purchaseToken);
    const tokenOwner = await this.tenantRepository.findByGooglePlayPurchaseTokenHash(tokenHash);
    if (tokenOwner && tokenOwner.id !== input.tenantId) {
      throw new GooglePlayBillingError("Esta compra já está vinculada a outra empresa.", 409);
    }

    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new GooglePlayBillingError("Empresa não encontrada.", 404);
    }

    const currentPeriodEnd = this.requireEntitledPurchase(purchase, lineItem);
    tenant.plan = "monthly";
    tenant.subscriptionStatus = "active";
    tenant.variantId = variantId;
    tenant.currentPeriodEnd = currentPeriodEnd;
    tenant.billingProvider = "google_play";
    tenant.googlePlayPurchaseTokenHash = tokenHash;
    tenant.googlePlayObfuscatedAccountId = expectedAccountId;
    tenant.googlePlayProductId = input.productId;
    tenant.googlePlayLatestOrderId = lineItem.latestSuccessfulOrderId;
    await this.tenantRepository.save(tenant);

    if (purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
      await this.acknowledge(input.productId, input.purchaseToken);
    }

    return { variantId, currentPeriodEnd };
  }

  async syncNotification(purchaseToken: string, packageName: string): Promise<void> {
    if (packageName !== this.config.packageName) {
      throw new GooglePlayBillingError("Pacote da notificação inválido.", 400);
    }
    if (!purchaseToken || purchaseToken.length > 4096) {
      throw new GooglePlayBillingError("Token de notificação inválido.");
    }

    const purchase = await this.getSubscription(purchaseToken);
    const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    const tokenHash = GooglePlayBilling.hash(purchaseToken);
    let tenant = await this.tenantRepository.findByGooglePlayPurchaseTokenHash(tokenHash);
    if (!tenant && accountId) {
      tenant = await this.tenantRepository.findByGooglePlayObfuscatedAccountId(accountId);
    }
    if (!tenant) {
      throw new GooglePlayBillingError("Compra ainda não vinculada a uma empresa.", 503);
    }

    const lineItem = this.getPurchasedLineItem(purchase);
    const productId = lineItem.productId!;
    const variantId = this.variantForProduct(productId);
    const expiry = lineItem.expiryTime ? new Date(lineItem.expiryTime) : undefined;
    const isEntitled = this.isEntitledState(purchase.subscriptionState) &&
      Boolean(expiry && expiry.getTime() > Date.now());

    // Uma notificação atrasada de um token substituído nunca deve revogar uma
    // assinatura mais nova que já esteja ativa.
    if (
      tenant.googlePlayPurchaseTokenHash &&
      tenant.googlePlayPurchaseTokenHash !== tokenHash &&
      tenant.currentPeriodEnd &&
      expiry &&
      tenant.currentPeriodEnd.getTime() > expiry.getTime()
    ) {
      return;
    }

    tenant.plan = "monthly";
    tenant.subscriptionStatus = isEntitled ? "active" :
      purchase.subscriptionState === "SUBSCRIPTION_STATE_EXPIRED" ? "canceled" : "past_due";
    tenant.variantId = variantId;
    tenant.currentPeriodEnd = expiry;
    tenant.billingProvider = "google_play";
    tenant.googlePlayPurchaseTokenHash = tokenHash;
    tenant.googlePlayObfuscatedAccountId = accountId || tenant.googlePlayObfuscatedAccountId;
    tenant.googlePlayProductId = productId;
    tenant.googlePlayLatestOrderId = lineItem.latestSuccessfulOrderId;
    await this.tenantRepository.save(tenant);
  }

  async verifyPubSubAuthorization(authorizationHeader?: string): Promise<void> {
    const audience = this.config.pubsubAudience;
    const expectedEmail = this.config.pubsubServiceAccountEmail;
    if (!audience || !expectedEmail) {
      throw new GooglePlayBillingError("Autenticação Pub/Sub não configurada.", 503);
    }
    const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new GooglePlayBillingError("Autorização Pub/Sub ausente.", 401);
    }
    const ticket = await this.oidcClient.verifyIdToken({ idToken: match[1], audience });
    const payload = ticket.getPayload();
    if (!payload?.email_verified || payload.email !== expectedEmail) {
      throw new GooglePlayBillingError("Origem Pub/Sub não autorizada.", 403);
    }
  }

  private parseCredentials(): Record<string, unknown> | undefined {
    const raw = this.config.serviceAccountJson ||
      (this.config.serviceAccountBase64
        ? Buffer.from(this.config.serviceAccountBase64, "base64").toString("utf8")
        : undefined);
    if (!raw) return undefined;
    try {
      const credentials = JSON.parse(raw);
      if (typeof credentials.private_key === "string") {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      }
      return credentials;
    } catch {
      throw new GooglePlayBillingError("Credencial da Google Play inválida.", 500);
    }
  }

  private async accessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const response = await client.getAccessToken();
    if (!response.token) {
      throw new GooglePlayBillingError("Não foi possível autenticar na Google Play.", 503);
    }
    return response.token;
  }

  private async getSubscription(purchaseToken: string): Promise<GoogleSubscriptionPurchase> {
    const accessToken = await this.accessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(this.config.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new GooglePlayBillingError(
        response.status === 404 ? "Compra não encontrada na Google Play." : "Não foi possível validar a compra na Google Play.",
        response.status === 404 ? 400 : 503,
      );
    }
    return response.json() as Promise<GoogleSubscriptionPurchase>;
  }

  private async acknowledge(productId: string, purchaseToken: string): Promise<void> {
    const accessToken = await this.accessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(this.config.packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok && response.status !== 409) {
      throw new GooglePlayBillingError("A compra foi validada, mas não pôde ser confirmada na Google Play.", 503);
    }
  }

  private variantForProduct(productId: string): PlanVariant {
    if (productId === this.config.basicProductId) return "basic";
    if (productId === this.config.proProductId) return "pro";
    throw new GooglePlayBillingError("Produto não autorizado.", 400);
  }

  private getPurchasedLineItem(
    purchase: GoogleSubscriptionPurchase,
    expectedProductId?: string,
  ): GoogleSubscriptionLineItem {
    const allowedIds = new Set(Object.values(this.getProductIds()));
    const candidates = (purchase.lineItems || []).filter(
      (item) => item.productId && allowedIds.has(item.productId) &&
        (!expectedProductId || item.productId === expectedProductId),
    );
    candidates.sort((a, b) =>
      new Date(b.expiryTime || 0).getTime() - new Date(a.expiryTime || 0).getTime(),
    );
    if (!candidates[0]) {
      throw new GooglePlayBillingError("A compra não contém um plano autorizado.", 400);
    }
    return candidates[0];
  }

  private requireEntitledPurchase(
    purchase: GoogleSubscriptionPurchase,
    lineItem: GoogleSubscriptionLineItem,
  ): Date {
    const expiry = lineItem.expiryTime ? new Date(lineItem.expiryTime) : undefined;
    if (!this.isEntitledState(purchase.subscriptionState) || !expiry || expiry.getTime() <= Date.now()) {
      throw new GooglePlayBillingError("A assinatura ainda não está ativa na Google Play.", 409);
    }
    return expiry;
  }

  private isEntitledState(state?: string): boolean {
    return state === "SUBSCRIPTION_STATE_ACTIVE" ||
      state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ||
      state === "SUBSCRIPTION_STATE_CANCELED";
  }
}
