const dotenv = require("dotenv");
const path = require("path");

// Load .env.local if in development (default), or .env.production if explicitly set
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(__dirname, "..", envFile) });

// Fallback to standard .env if specific file doesn't exist or variables needed
dotenv.config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Erro: MONGO_URI não definida no arquivo .env");
  console.error(
    "👉 Crie um arquivo 'backend/.env' com: MONGO_URI=sua_string_de_conexao",
  );
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch((err) => console.error("❌ Erro ao conectar no MongoDB:", err));
}

// --- Schema & Model ---
// --- Schemas & Models ---
const washSchema = new mongoose.Schema({
  clientId: String, // Reference to Client ID (MongoDB _id or custom ID)
  plate: String,
  carModel: String,
  price: Number,
  entryTime: { type: Date, default: Date.now },
  deliveryTime: Date,
  status: { type: String, default: "pending" }, // pending, completed, cancelled
  paymentMethod: String, // money, card, pix
  createdAt: { type: Date, default: Date.now },
});

const clientSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  plate: { type: String, unique: true }, // Ensure uniqueness
  carModel: String,
  // washPrice removed from here, moved to Wash
  createdAt: { type: Date, default: Date.now },
});

const Client = mongoose.model("Client", clientSchema);
const Wash = mongoose.model("Wash", washSchema);

// --- Routes ---

// Health Check
app.get("/", (req, res) => {
  res.send("VIP CAR Backend está rodando! 🚗💨");
});

// Register Service (Upsert Client + Create Wash)
app.post("/services", async (req, res) => {
  try {
    const {
      name,
      phone,
      plate,
      carModel,
      washPrice,
      deliveryTime,
      paymentMethod,
    } = req.body;

    // 0. Validator
    if (carModel && carModel.length > 30) {
      return res.status(400).json({
        error: "O modelo do carro deve ter no máximo 30 caracteres.",
      });
    }

    // Check for duplicate pending service
    const existingWash = await Wash.findOne({ plate, status: "pending" });
    if (existingWash) {
      return res.status(409).json({
        error: "Este carro já possui uma lavagem pendente na fila.",
      });
    }

    // 1. Find or Create Client
    let client = await Client.findOne({ plate });

    if (client) {
      // Update existing client info
      client.name = name;
      client.phone = phone;
      client.carModel = carModel;
      await client.save();
    } else {
      // Create new client
      client = new Client({
        id: crypto.randomUUID(),
        name,
        phone,
        plate,
        carModel,
      });
      await client.save();
    }

    // 2. Create Wash Record
    const newWash = new Wash({
      clientId: client.id, // Store the custom ID or _id
      plate: client.plate,
      carModel: client.carModel,
      price: parseFloat(
        washPrice
          ? washPrice.replace("R$", "").replace(".", "").replace(",", ".")
          : "0",
      ),
      deliveryTime: new Date(deliveryTime),
      paymentMethod,
      status: "pending",
    });

    await newWash.save();

    res.status(201).json({
      success: true,
      client,
      wash: newWash,
    });
  } catch (error) {
    console.error("Erro ao registrar serviço:", error);
    res.status(500).json({ error: error.message });
  }
});

// List Services (Queue)
app.get("/services", async (req, res) => {
  try {
    // Auto-update status logic removed to allow manual toggle
    // Auto-update status logic re-enabled
    await Wash.updateMany(
      {
        status: "pending",
        deliveryTime: { $lt: new Date() },
      },
      { $set: { status: "completed" } },
    );

    const { status, date } = req.query;
    let filter = { status: { $ne: "cancelled" } }; // Default: All (except cancelled)

    if (status && status !== "all") {
      filter.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.deliveryTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const services = await Wash.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "clients", // Collection name (mongoose pluralizes 'Client' to 'clients')
          localField: "clientId",
          foreignField: "id",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" }, // Flatten the array
      {
        $project: {
          _id: 1,
          plate: 1,
          carModel: 1,
          price: 1,
          entryTime: 1,
          deliveryTime: 1,
          status: 1,
          paymentMethod: 1, // Include payment method
          clientName: "$clientInfo.name",
          clientPhone: "$clientInfo.phone",
        },
      },
      { $sort: { deliveryTime: 1 } }, // Sort by nearest delivery
    ]);

    res.json(services);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update Service Status
app.patch("/services/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const wash = await Wash.findByIdAndUpdate(id, { status }, { new: true });

    res.json(wash);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Client (Legacy/Direct) - Optional, kept for compatibility if needed
app.post("/clients", async (req, res) => {
  try {
    const clientData = req.body;
    // Gerar ID se não vier (compatibilidade com UUID do frontend)
    if (!clientData.id) {
      clientData.id = crypto.randomUUID();
    }
    const newClient = new Client(clientData);
    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Clients
app.get("/clients", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search Clients
app.get("/clients/search", async (req, res) => {
  const { q } = req.query;
  try {
    const regex = new RegExp(q, "i"); // Case insensitive
    const clients = await Client.find({
      $or: [
        { name: regex },
        { plate: regex },
        { phone: regex },
        { carModel: regex },
      ],
    }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Client
app.put("/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, plate, carModel } = req.body;

    const client = await Client.findOneAndUpdate(
      { id }, // Procura pelo ID (UUID) customizado
      { name, phone, plate, carModel },
      { new: true },
    );

    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(client);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(
    `🌍 Ambiente: ${
      process.env.NODE_ENV === "production"
        ? "PRODUÇÃO 🔴"
        : "DESENVOLVIMENTO 🟢"
    }`,
  );
  console.log(`📂 Arquivo env: ${envFile}`);
  if (MONGO_URI) {
    const hiddenUri = MONGO_URI.replace(
      /(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/,
      "$1$2:*****@",
    );
    console.log(`🛢️  MongoDB: ${hiddenUri}\n`);
  }
});
