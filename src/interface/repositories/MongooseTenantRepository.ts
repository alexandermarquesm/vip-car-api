import { Tenant } from "../../domain/entities/Tenant";
import { ITenantRepository } from "../../application/repositories/ITenantRepository";
import TenantModel from "../../infrastructure/database/mongoose-models/TenantModel";

export class MongooseTenantRepository implements ITenantRepository {
  private toEntity(doc: any): Tenant {
    return new Tenant({
      id: doc.id,
      name: doc.name,
      document: doc.document,
      status: doc.status,
      plan: doc.plan,
      subscriptionStatus: doc.subscriptionStatus,
      trialEndsAt: doc.trialEndsAt,
      createdAt: doc.createdAt,
      externalCustomerId: doc.externalCustomerId,
      externalSubscriptionId: doc.externalSubscriptionId,
      billingProvider: doc.billingProvider,
      googlePlayPurchaseTokenHash: doc.googlePlayPurchaseTokenHash,
      googlePlayObfuscatedAccountId: doc.googlePlayObfuscatedAccountId,
      googlePlayProductId: doc.googlePlayProductId,
      googlePlayLatestOrderId: doc.googlePlayLatestOrderId,
      variantId: doc.variantId,
      currentPeriodEnd: doc.currentPeriodEnd,
      creditCardFee: doc.creditCardFee !== undefined ? doc.creditCardFee : 3.09,
      debitCardFee: doc.debitCardFee !== undefined ? doc.debitCardFee : 0.89,
      inviteCode: doc.inviteCode,
    });
  }

  async findByDocument(document: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ document });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByExternalCustomerId(externalCustomerId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ externalCustomerId });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByGooglePlayPurchaseTokenHash(tokenHash: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ googlePlayPurchaseTokenHash: tokenHash });
    return doc ? this.toEntity(doc) : null;
  }

  async findByGooglePlayObfuscatedAccountId(accountId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ googlePlayObfuscatedAccountId: accountId });
    return doc ? this.toEntity(doc) : null;
  }

  async findById(id: string): Promise<Tenant | null> {
    const doc = await TenantModel.findById(id);
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByInviteCode(inviteCode: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async save(tenant: Tenant): Promise<Tenant> {
    const doc = await TenantModel.findOneAndUpdate(
      { _id: tenant.id },
      {
        name: tenant.name,
        document: tenant.document,
        status: tenant.status,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
        externalCustomerId: tenant.externalCustomerId,
        externalSubscriptionId: tenant.externalSubscriptionId,
        billingProvider: tenant.billingProvider,
        googlePlayPurchaseTokenHash: tenant.googlePlayPurchaseTokenHash,
        googlePlayObfuscatedAccountId: tenant.googlePlayObfuscatedAccountId,
        googlePlayProductId: tenant.googlePlayProductId,
        googlePlayLatestOrderId: tenant.googlePlayLatestOrderId,
        variantId: tenant.variantId,
        currentPeriodEnd: tenant.currentPeriodEnd,
        creditCardFee: tenant.creditCardFee,
        debitCardFee: tenant.debitCardFee,
        inviteCode: tenant.inviteCode,
      },
      { returnDocument: 'after', upsert: true }
    );
    return tenant;
  }
}
