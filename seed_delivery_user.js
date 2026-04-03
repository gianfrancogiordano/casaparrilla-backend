require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI no está definido en el archivo .env.");
  process.exit(1);
}

// Schemas mínimos
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [String]
});
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  active: { type: Boolean, default: true }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seed() {
  try {
    console.log("Intentando conectar a MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas.");

    // Buscar o crear el rol "Sistema"
    let systemRole = await Role.findOne({ name: 'Sistema' });
    if (!systemRole) {
      console.log("🌱 Creando rol 'Sistema'...");
      systemRole = new Role({
        name: 'Sistema',
        permissions: ['create_orders', 'read_orders', 'update_orders', 'read_menu', 'manage_clients']
      });
      await systemRole.save();
    }

    // Datos del usuario "Delivery"
    const userName = 'Delivery';
    const userEmail = 'delivery_bot@casaparrilla.com';
    const plainPassword = 'delivery_secure_pass_' + Math.random().toString(36).substring(7);

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // Revisar si ya existe el usuario
    const existingUser = await User.findOne({ name: userName });
    if (existingUser) {
      console.log(`⚠️ El usuario ${userName} ya existe. Vinculando al rol 'Sistema'...`);
      existingUser.role = systemRole._id;
      await existingUser.save();
      console.log("✅ Usuario 'Delivery' actualizado.");
    } else {
      // Crear nuevo usuario
      const newBot = new User({
        name: userName,
        email: userEmail,
        passwordHash: passwordHash,
        role: systemRole._id,
        active: true
      });
      await newBot.save();
      console.log("✅ ¡Éxito! Usuario 'Delivery' creado en la base de datos.");
    }

  } catch (err) {
    console.error("❌ Ocurrió un error:", err);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Desconectado.");
    process.exit(0);
  }
}

seed();
