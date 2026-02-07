require("dotenv").config();
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
    const { name, phone, plate, carModel, washPrice, deliveryTime } = req.body;

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
    const { status } = req.query;
    const filter = status ? { status } : { status: { $ne: "cancelled" } }; // Default: All non-cancelled

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

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
