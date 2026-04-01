require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌ MONGODB_URI no definido"); process.exit(1); }

const roleSchema = new mongoose.Schema({ name: String });
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

const userSchema = new mongoose.Schema({
  name: String, email: String, passwordHash: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  active: { type: Boolean, default: true }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB.");

    const meseroRole = await Role.findOne({ name: 'Mesero' });
    if (!meseroRole) {
      console.error("❌ Rol 'Mesero' no encontrado. Ejecuta seed_roles.js primero.");
      process.exit(1);
    }

    const name     = 'mesero1';
    const email    = 'mesero1@casaparrilla.com';
    const password = 'mesero123';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const existing = await User.findOne({ $or: [{ name }, { email }] });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = meseroRole._id;
      await existing.save();
      console.log(`⚠️  Usuario '${name}' ya existía — contraseña y rol actualizados.`);
    } else {
      await User.create({ name, email, passwordHash, role: meseroRole._id, active: true });
      console.log(`✅ Usuario mesero creado exitosamente.`);
    }

    console.log("\n📋 Credenciales:");
    console.table({ Usuario: name, Contraseña: password, Rol: 'Mesero', Email: email });

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seed();
