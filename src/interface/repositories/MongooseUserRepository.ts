import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../application/repositories/IUserRepository";
import UserModel from "../../infrastructure/database/mongoose-models/UserModel";

export class MongooseUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    if (!doc) return null;
    return new User({
      id: doc.id,
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role as any,
      status: doc.status as any,
      createdAt: doc.createdAt,
    });
  }

  async save(user: User): Promise<User> {
    const doc = await UserModel.findOneAndUpdate(
      { _id: user.id },
      {
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      { returnDocument: 'after', upsert: true }
    );
    return user;
  }
}
