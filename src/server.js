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
const clientSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  plate: String,
  carModel: String,
  deliveryTime: String,
  createdAt: { type: Date, default: Date.now },
});

const Client = mongoose.model("Client", clientSchema);

// --- Routes ---

// Health Check
app.get("/", (req, res) => {
  res.send("VIP CAR Backend está rodando! 🚗💨");
});

// Create Client
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
