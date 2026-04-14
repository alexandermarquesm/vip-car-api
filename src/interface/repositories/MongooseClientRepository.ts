import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../../application/repositories/IClientRepository";
import ClientModel from "../../infrastructure/database/mongoose-models/ClientModel";

export class MongooseClientRepository implements IClientRepository {
  async save(client: Client): Promise<Client> {
    const data = {
      tenantId: client.tenantId,
      _id: client.id,
      name: client.name,
      phone: client.phone,
      vehicles: client.vehicles,
      createdAt: client.createdAt,
    };

    const doc = await ClientModel.findOneAndUpdate(
      { tenantId: client.tenantId, _id: client.id },
      { $set: data },
      { upsert: true, new: true },
    );

    return this._mapToEntity(doc);
  }

  async findByPhone(tenantId: string, phone: string): Promise<Client | null> {
    const doc = await ClientModel.findOne({ tenantId, phone });
    return doc ? this._mapToEntity(doc) : null;
  }

  async findById(tenantId: string, id: string): Promise<Client | null> {
    const doc = await ClientModel.findOne({ tenantId, _id: id });
    return doc ? this._mapToEntity(doc) : null;
  }

  async findByName(tenantId: string, name: string): Promise<Client[]> {
    const regex = new RegExp(name, "i");
    const docs = await ClientModel.find({ tenantId, name: regex }).sort({
      createdAt: -1,
    });
    return docs.map((doc) => this._mapToEntity(doc));
  }

  async search(tenantId: string, query: string): Promise<Client[]> {
    const regex = new RegExp(query, "i");
    const docs = await ClientModel.find({
      tenantId,
      $or: [
        { name: regex },
        { phone: regex },
        { "vehicles.plate": regex },
      ],
    }).sort({
      createdAt: -1,
    });
    return docs.map((doc) => this._mapToEntity(doc));
  }

  async update(
    tenantId: string,
    id: string,
    updateData: Partial<Client>,
  ): Promise<Client | null> {
    const doc = await ClientModel.findOneAndUpdate({ tenantId, _id: id }, updateData, {
      new: true,
    });
    return doc ? this._mapToEntity(doc) : null;
  }

  async findAll(tenantId: string): Promise<Client[]> {
    const docs = await ClientModel.find({ tenantId }).sort({ createdAt: -1 });
    return docs.map((doc) => this._mapToEntity(doc));
  }
  
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await ClientModel.deleteOne({ tenantId, _id: id });
    return result.deletedCount > 0;
  }

  private _mapToEntity(doc: any): Client {
    return new Client({
      tenantId: doc.tenantId.toString(),
      id: doc._id,
      name: doc.name,
      phone: doc.phone,
      vehicles: doc.vehicles,
      createdAt: doc.createdAt,
    });
  }
}
