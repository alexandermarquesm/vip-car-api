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
  netPrice: Number, // Valor líquido após taxas (ex: maquininha de cartão)
  entryTime: { type: Date, default: Date.now },
  deliveryTime: Date,
  status: { type: String, default: "pending" }, // pending, completed, cancelled
  paymentMethod: String, // Legacy: money, card, pix (kept for backward compatibility)
  payments: [
    {
      method: { type: String, enum: ["money", "card", "pix"] },
      amount: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const clientSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: { type: String, unique: true }, // Chave única do cliente
  plate: String, // Última placa utilizada (opcional e não único)
  carModel: String, // Último modelo utilizado
  vehicles: [
    {
      plate: String,
      carModel: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Client = mongoose.model("Client", clientSchema);
const Wash = mongoose.model("Wash", washSchema);

// Taxa do Cartão de Crédito/Débito (Ex: aprox 0.8833% baseado em 60 -> 59.47)
const CARD_FEE_PERCENTAGE = 0.0088333;

function calculateNetPrice(amount, method) {
  if (method === "card") {
    // Retorna o valor descontado da taxa (arredondado para 2 casas decimais)
    return Number((amount - amount * CARD_FEE_PERCENTAGE).toFixed(2));
  }
  return amount; // Sem desconto para dinheiro/pix
}

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

    const sanitizedPlate = plate ? plate.trim().toUpperCase() : "";
    const sanitizedPhone = phone ? phone.replace(/\D/g, "") : ""; // Remove máscara para busca

    // 0. Validator
    if (carModel && carModel.length > 30) {
      return res.status(400).json({
        error: "O modelo do carro deve ter no máximo 30 caracteres.",
      });
    }

    // Check for duplicate pending service
    const existingWash = await Wash.findOne({
      plate: sanitizedPlate,
      status: "pending",
    });
    if (existingWash) {
      return res.status(409).json({
        error: `O veículo ${sanitizedPlate} já possui uma lavagem pendente na fila (desde ${existingWash.createdAt.toLocaleString()}).`,
      });
    }

    // Check if plate belongs to another phone
    const otherOwner = await Client.findOne({
      $or: [{ plate: sanitizedPlate }, { "vehicles.plate": sanitizedPlate }],
    });
    if (otherOwner) {
      const otherOwnerPhone = (otherOwner.phone || "").replace(/\D/g, "");
      if (otherOwnerPhone !== sanitizedPhone) {
        return res.status(400).json({
          error: `A placa ${sanitizedPlate} já está cadastrada para outro cliente (${otherOwner.name}).`,
        });
      }
    }

    // 1. Find or Create Client by PHONE
    let client = null;
    if (sanitizedPhone) {
      client = await Client.findOne({ phone: sanitizedPhone });
    }

    if (client) {
      // Update existing client info
      client.name = name;

      if (plate) {
        // Add to vehicles array if not present
        const hasVehicle = client.vehicles.some(
          (v) => v.plate.toUpperCase() === sanitizedPlate,
        );
        if (!hasVehicle) {
          client.vehicles.push({ plate: sanitizedPlate, carModel });
        }
      }
      await client.save();
    } else {
      // Create new client (Phone is the key)
      const newClientData = {
        id: crypto.randomUUID(),
        name,
        phone: sanitizedPhone,
        vehicles: [],
      };

      if (plate) {
        newClientData.vehicles.push({ plate: sanitizedPlate, carModel });
      }

      client = new Client(newClientData);
      await client.save();
    }

    // 2. Create Wash Record
    const numericPrice = parseFloat(
      washPrice
        ? washPrice.replace("R$", "").replace(".", "").replace(",", ".")
        : "0",
    );

    const newWash = new Wash({
      clientId: client.id,
      plate: sanitizedPlate, // Mantemos na lavagem como snapshot
      carModel: carModel,
      price: numericPrice,
      netPrice: calculateNetPrice(numericPrice, paymentMethod),
      deliveryTime: new Date(deliveryTime),
      paymentMethod, // Optional initial method
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
    // Auto-update status logic removed to allow manual toggle
    /*
    await Wash.updateMany(
      {
        status: "pending",
        deliveryTime: { $lt: new Date() },
      },
      { $set: { status: "completed" } },
    );
    */

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
          from: "clients",
          localField: "clientId",
          foreignField: "id",
          as: "clientInfo",
        },
      },
      {
        $unwind: {
          path: "$clientInfo",
          preserveNullAndEmptyArrays: true, // Não esconde a lavagem se o cliente sumir
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
      { $sort: { deliveryTime: 1 } },
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
    const { status, paymentMethod, payments } = req.body;

    // Precisamos buscar o documento original para o cálculo correto dos juros
    // caso o method venha vazio ou só um pagamento
    const currentWash = await Wash.findById(id);
    if (!currentWash) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    const updateData = { status };

    // Prevent duplicate pending services for the same plate (e.g., on Undo)
    if (status === "pending") {
      const existingWash = await Wash.findOne({
        plate: currentWash.plate,
        status: "pending",
        _id: { $ne: id },
      });
      if (existingWash) {
        return res.status(409).json({
          error: `O veículo ${currentWash.plate} já possui uma lavagem pendente na fila.`,
        });
      }
    }

    if (status === "completed") {
      if (payments && Array.isArray(payments)) {
        updateData.payments = payments;
        // Determine primary payment method
        if (payments.length > 0) {
          const mainPayment = payments.reduce((prev, current) =>
            prev.amount > current.amount ? prev : current,
          );
          updateData.paymentMethod = mainPayment.method;

          // Calcular netPrice somando cada pagamento e seu desconto individual
          let totalNet = 0;
          for (const payment of payments) {
            totalNet += calculateNetPrice(payment.amount, payment.method);
          }
          updateData.netPrice = Number(totalNet.toFixed(2));
        }
      } else if (paymentMethod) {
        // Fallback for single payment method if payments array not provided
        updateData.paymentMethod = paymentMethod;

        // Calcular netPrice com base no valor total atual e no novo metodo
        updateData.netPrice = calculateNetPrice(
          currentWash.price,
          paymentMethod,
        );
      }
    }

    const wash = await Wash.findByIdAndUpdate(id, updateData, { new: true });

    res.json(wash);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Service Price
app.patch("/services/:id/price", async (req, res) => {
  try {
    const { id } = req.params;
    let { price } = req.body;

    const finalPrice = price || 0;

    const currentWash = await Wash.findById(id);
    if (!currentWash) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    const updateData = {
      price: finalPrice,
      // Recalculate netPrice based on current paymentMethod if it exists
      netPrice: currentWash.paymentMethod
        ? calculateNetPrice(finalPrice, currentWash.paymentMethod)
        : finalPrice,
    };

    // If there's a payments array, we should ideally redistribute or recalculate.
    // However, since we only edit pending services (usually), netPrice fallback is OK.
    // If it's already completed, the logic below handles multiple payments:
    if (
      currentWash.payments &&
      currentWash.payments.length > 0 &&
      currentWash.status === "completed"
    ) {
      // For simplicity, we don't want to mess with specific splits automatically
      // so we keep the proportional discount for netPrice
      const feeRatio = currentWash.netPrice / currentWash.price;
      updateData.netPrice = Number((finalPrice * feeRatio).toFixed(2));
    }

    const wash = await Wash.findByIdAndUpdate(id, updateData, { new: true });
    res.json(wash);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full Database Backup
app.get("/backup", async (req, res) => {
  try {
    const clients = await Client.find({});
    const washes = await Wash.find({});

    res.json({
      timestamp: new Date().toISOString(),
      counts: {
        clients: clients.length,
        washes: washes.length,
      },
      data: {
        clients,
        washes,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar backup:", error);
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
        { phone: regex },
        { "vehicles.plate": regex },
        { "vehicles.carModel": regex },
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
      { id },
      { name, phone }, // Não atualizamos mais plate/carModel no topo
      { new: true },
    );

    // If plate changed, ensure it's in the vehicles array
    if (client && plate) {
      const sanitizedPlate = plate.trim().toUpperCase();
      const hasVehicle = client.vehicles.some(
        (v) => v.plate.toUpperCase() === sanitizedPlate,
      );
      if (!hasVehicle) {
        client.vehicles.push({ plate: sanitizedPlate, carModel });
        await client.save();
      }
    }

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
