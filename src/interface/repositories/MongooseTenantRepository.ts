import { Tenant } from "../../domain/entities/Tenant";
import { ITenantRepository } from "../../application/repositories/ITenantRepository";
import TenantModel from "../../infrastructure/database/mongoose-models/TenantModel";

export class MongooseTenantRepository implements ITenantRepository {
  async findByDocument(document: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ document });
    if (!doc) return null;
    return new Tenant({
      id: doc.id,
      name: doc.name,
      document: doc.document,
      status: doc.status as any,
      plan: doc.plan as any,
      subscriptionStatus: doc.subscriptionStatus as any,
      trialEndsAt: doc.trialEndsAt,
      createdAt: doc.createdAt,
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    const doc = await TenantModel.findById(id);
    if (!doc) return null;
    return new Tenant({
      id: doc.id,
      name: doc.name,
      document: doc.document,
      status: doc.status as any,
      plan: doc.plan as any,
      subscriptionStatus: doc.subscriptionStatus as any,
      trialEndsAt: doc.trialEndsAt,
      createdAt: doc.createdAt,
    });
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
      },
      { new: true, upsert: true }
    );
    return tenant;
  }
}
