require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no definido en .env");
  process.exit(1);
}

const configuracionSchema = new mongoose.Schema({
  nombreRestaurante: String,
  monedaPrincipal:   String,
  tasaCambioUsdBs:   Number,
  tasaCambioUsdCop:  Number,
  cantidadMesas:     Number,
  direccion:         String,
  telefono:          String,
  logoUrl:           String,
  activo:            Boolean,
}, { timestamps: true });

const Configuracion = mongoose.models.Configuracion || mongoose.model('Configuracion', configuracionSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB.");

    const existing = await Configuracion.findOne();
    if (existing) {
      console.log("⚠️  Ya existe configuración. Actualizando tasas y datos...");
      existing.tasaCambioUsdBs  = 56.50;  // <- Actualiza con la tasa real
      existing.tasaCambioUsdCop = 4200.0; // <- Actualiza con la tasa real
      await existing.save();
      console.log("✅ Configuración actualizada.");
    } else {
      await Configuracion.create({
        nombreRestaurante: 'Casa Parrilla',
        monedaPrincipal:   'USD',
        tasaCambioUsdBs:   56.50,   // Bs por cada 1 USD (actualizar según mercado)
        tasaCambioUsdCop:  4200.0,  // COP por cada 1 USD (actualizar según mercado)
        cantidadMesas:     12,
        direccion:         'Tu dirección aquí',
        telefono:          '+58 000 000 0000',
        activo:            true,
      });
      console.log("✅ ¡Configuración inicial de Casa Parrilla creada exitosamente!");
    }

    console.log("\n📋 Configuración actual:");
    const config = await Configuracion.findOne().lean();
    console.table({
      Restaurante:       config.nombreRestaurante,
      Moneda:            config.monedaPrincipal,
      'Tasa USD→BS':     config.tasaCambioUsdBs,
      'Tasa USD→COP':    config.tasaCambioUsdCop,
      'Cant. Mesas':     config.cantidadMesas,
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Desconectado.");
    process.exit(0);
  }
}

seed();
