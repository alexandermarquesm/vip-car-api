const crypto = require("crypto");
const bcrypt = require("bcryptjs");

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log("Iniciando migração Multi-Tenant...");

    // 1. Criar um Tenant Base (Legado)
    const tenantId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
      
    // Mongoose usually uses ObjectIds, but looking at TenantModel schema it doesn't specify 'id' it uses default Mongoose _id. 
    // Wait! Let's just create an ObjectId.
    // wait, we can just let Mongo map it, or we can use `db.collection.insertOne` which generates an _id if not passed.
    
    const insertTenantResult = await db.collection("tenants").insertOne({
        name: "Lavagem Matriz (Legado)",
        status: "active",
        createdAt: new Date()
    });
    const parsedTenantId = insertTenantResult.insertedId;

    console.log("Tenant Legacy criado:", parsedTenantId);

    // 2. Criar um Usuário Base para esse Tenant
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("123456", salt);

    await db.collection("users").insertOne({
        tenantId: parsedTenantId,
        name: "Administrador",
        email: "admin@lavagem.com",
        passwordHash,
        role: "owner",
        status: "active",
        createdAt: new Date()
    });
    console.log("Usuário Admin (owner) criado com senha padrão '123456'.");

    // 3. Atualizar todos os Washes
    // Dropping existing single-tenant indexes
    try {
        await db.collection("washes").dropIndex("plate_1_status_1");
    } catch(e) { console.log("Índice antigo Wash inexistente") }
    
    await db.collection("washes").updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: parsedTenantId } }
    );
    console.log("Coleção 'washes' atualizada com o tenantId.");

    // 4. Atualizar todos os Clients
    try {
        await db.collection("clients").dropIndex("id_1");
        await db.collection("clients").dropIndex("phone_1");
    } catch(e) { console.log("Índices antigos Client inexistentes") }

    await db.collection("clients").updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: parsedTenantId } }
    );
    console.log("Coleção 'clients' atualizada com o tenantId.");
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Isso é agressivo, pois revogar removerá TUDO
    console.log("Revertendo migração Multi-Tenant...");
    await db.collection("washes").updateMany({}, { $unset: { tenantId: "" } });
    await db.collection("clients").updateMany({}, { $unset: { tenantId: "" } });
    await db.collection("tenants").deleteMany({});
    await db.collection("users").deleteMany({});
  }
};
