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

async function seedAdmin() {
  try {
    console.log("Intentando conectar a MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas.");

    // Buscar el rol administrador
    const adminRole = await Role.findOne({ name: 'Administrador' });
    if (!adminRole) {
      console.error("❌ Error: No se encontró el rol 'Administrador'. Por favor ejecuta seed_roles.js primero.");
      mongoose.connection.close();
      process.exit(1);
    }

    // Datos del administrador a crear
    const adminEmail = 'ggiordano@casaparrilla.com'; 
    const adminUser = 'ggiordano';
    const plainPassword = 'g576huh6';

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // Revisar si ya existe el usuario (por email o nombre)
    const existingUser = await User.findOne({ $or: [{ email: adminEmail }, { name: adminUser }] });
    if (existingUser) {
      console.log(`⚠️ El usuario ${existingUser.name} ya existe. Actualizando contraseña y rol...`);
      existingUser.passwordHash = passwordHash;
      existingUser.role = adminRole._id;
      await existingUser.save();
      console.log("✅ Usuario administrador actualizado exitosamente.");
    } else {
      // Crear nuevo usuario
      const newAdmin = new User({
        name: adminUser,
        email: adminEmail,
        passwordHash: passwordHash,
        role: adminRole._id,
        active: true
      });
      await newAdmin.save();
      console.log("✅ ¡Éxito! Usuario administrador creado en la base de datos.");
    }

  } catch (err) {
    console.error("❌ Ocurrió un error guardando en Base de Datos:", err);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Desconectado.");
    process.exit(0);
  }
}

seedAdmin();
