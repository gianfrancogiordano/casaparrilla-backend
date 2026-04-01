require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI no está definido en el archivo .env.");
  console.error("Por favor, asegúrate de haber actualizado .env con tu conexión de MongoAtlas real.");
  process.exit(1);
}

// Se define el Schema mínimo necesario para la inserción
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [String]
}, { timestamps: true });

// Evitar recompilar el modelo si ya existe en memoria en caso de ejecuciones en paralelo
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

const rolesToSeed = [
  {
    name: 'Administrador',
    description: 'Control absoluto del sistema. Visualización financiera y configuración.',
    permissions: ['create_orders', 'read_orders', 'update_orders', 'delete_orders', 'manage_menu', 'manage_inventory', 'manage_users', 'view_reports', 'manage_roles']
  },
  {
    name: 'Cajero',
    description: 'Gestión de caja y cobro de platillos.',
    permissions: ['create_orders', 'read_orders', 'process_payments', 'manage_clients', 'read_menu']
  },
  {
    name: 'Mesero',
    description: 'Personal de sala. Apertura de mesas e inyección de nuevas órdenes.',
    permissions: ['create_orders', 'read_orders', 'add_items_to_order', 'read_menu']
  },
  {
    name: 'Cocina',
    description: 'Solo visualización de las comandas y cambio de estado a Listo.',
    permissions: ['read_kitchen_tickets', 'update_order_status', 'read_inventory']
  },
  {
    name: 'Repartidor',
    description: 'Visualización de datos de envío del cliente para Delivery.',
    permissions: ['read_assigned_orders', 'update_delivery_status', 'read_client_address']
  }
];

async function seed() {
  try {
    console.log("Intentando conectar a MongoDB...");
    console.log("🌍 URI Configurado:", MONGODB_URI.split('@')[1] || "Localhost");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas.");

    console.log("🧹 Limpiando la colección actual de Roles...");
    await Role.deleteMany({});
    
    console.log("🌱 Insertando roles...");
    const result = await Role.insertMany(rolesToSeed);
    
    console.log(`✅ ¡Éxito! Se han guardado ${result.length} roles en la base de datos.`);
    
  } catch (err) {
    console.error("❌ Ocurrió un error guardando en Base de Datos:", err);
  } finally {
    // Cerramos la conexión para que el script no se quede en el aire
    mongoose.connection.close();
    console.log("🔌 Desconectado.");
    process.exit(0);
  }
}

seed();
