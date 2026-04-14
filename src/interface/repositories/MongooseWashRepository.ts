import { Wash } from "../../domain/entities/Wash";
import { IWashRepository } from "../../application/repositories/IWashRepository";
import WashModel from "../../infrastructure/database/mongoose-models/WashModel";

export class MongooseWashRepository implements IWashRepository {
  async save(wash: Wash): Promise<Wash> {
    const data = {
      tenantId: wash.tenantId,
      clientId: wash.clientId,
      plate: wash.plate,
      carModel: wash.carModel,
      price: wash.price,
      netPrice: wash.netPrice,
      deliveryTime: wash.deliveryTime,
      paymentMethod: wash.paymentMethod,
      status: wash.status,
      payments: wash.payments,
      createdAt: wash.createdAt,
    };

    try {
      const doc = await WashModel.findOneAndUpdate(
        { _id: wash._id, tenantId: wash.tenantId },
        data,
        {
          new: true,
          upsert: true,
        }
      );

      return this._mapToEntity(doc);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error(
          "Este veículo já possui um serviço pendente na fila."
        );
      }
      throw error;
    }
  }

  async findPendingByPlate(tenantId: string, plate: string): Promise<Wash | null> {
    const doc = await WashModel.findOne({ tenantId, plate, status: "pending" });
    return doc ? this._mapToEntity(doc) : null;
  }

  async findById(tenantId: string, id: string): Promise<Wash | null> {
    const doc = await WashModel.findOne({ tenantId, _id: id });
    return doc ? this._mapToEntity(doc) : null;
  }

  async update(tenantId: string, id: string, updateData: Partial<Wash>): Promise<Wash | null> {
    const doc = await WashModel.findOneAndUpdate({ tenantId, _id: id }, updateData, {
      new: true,
    });
    return doc ? this._mapToEntity(doc) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await WashModel.deleteOne({ tenantId, _id: id });
    return result.deletedCount > 0;
  }

  async findAll(tenantId: string): Promise<Wash[]> {
    const docs = await WashModel.find({ tenantId });
    return docs.map((doc) => this._mapToEntity(doc));
  }

  async findWithClientInfo(filter: any, search?: string): Promise<any[]> {
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      {
        $unwind: {
          path: "$clientInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          plate: 1,
          carModel: 1,
          price: 1,
          netPrice: 1,
          entryTime: 1,
          deliveryTime: 1,
          status: 1,
          paymentMethod: 1,
          payments: 1,
          clientName: { $ifNull: ["$clientInfo.name", "Cliente Desconhecido"] },
          clientPhone: { $ifNull: ["$clientInfo.phone", "S/ Tel"] },
        },
      },
      { $sort: { deliveryTime: -1 } }, // History usually shows newest first
    ];

    if (search) {
      const searchRegex = { $regex: "^" + search.trim(), $options: "i" };
      pipeline.push({
        $match: {
          $or: [
            { plate: searchRegex },
            { carModel: searchRegex },
            { clientName: searchRegex },
            { clientPhone: searchRegex },
          ],
        },
      });
    }

    const services = await WashModel.aggregate(pipeline);
    return services;
  }

  private _mapToEntity(doc: any): Wash {
    return new Wash({
      _id: doc._id,
      tenantId: doc.tenantId.toString(),
      clientId: doc.clientId,
      plate: doc.plate,
      carModel: doc.carModel,
      price: doc.price,
      netPrice: doc.netPrice,
      entryTime: doc.entryTime,
      deliveryTime: doc.deliveryTime,
      status: doc.status as any,
      paymentMethod: doc.paymentMethod,
      payments: doc.payments,
      createdAt: doc.createdAt,
    });
  }
}
