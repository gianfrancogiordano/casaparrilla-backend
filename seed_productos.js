require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌ MONGODB_URI no definido"); process.exit(1); }

const productSchema = new mongoose.Schema({
  name: String, description: String, sellPrice: Number,
  category: String, imageUrl: String,
  available: { type: Boolean, default: true },
  requiresKitchen: { type: Boolean, default: true },
  recipe: { type: Array, default: [] }
});
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const productos = [
  // 🥩 Parrillas
  { name: 'Parrilla Familiar', description: 'Surtido de carnes a la brasa para 4 personas. Incluye costilla, chorizos y pollo.', sellPrice: 45.00, category: 'Parrillas', available: true, requiresKitchen: true },
  { name: 'Parrilla Personal', description: 'Surtido de carnes a la brasa para 1 persona. Entraña + chorizo + morcilla.', sellPrice: 18.00, category: 'Parrillas', available: true, requiresKitchen: true },
  { name: 'Entraña a la Parrilla', description: 'Entraña de res jugosa, cocinada al carbón. Acompañada de chimichurri.', sellPrice: 22.00, category: 'Parrillas', available: true, requiresKitchen: true },
  { name: 'Costilla BBQ', description: 'Costilla de res marinada en salsa BBQ casera, cocinada lentamente al carbón.', sellPrice: 20.00, category: 'Parrillas', available: true, requiresKitchen: true },
  { name: 'Pollo a las Brasas (Completo)', description: 'Pollo entero marinado con hierbas frescas y asado al carbón.', sellPrice: 16.00, category: 'Parrillas', available: true, requiresKitchen: true },
  { name: 'Chorizos Caseros x3', description: 'Tres chorizos artesanales elaborados con receta propia de la casa.', sellPrice: 9.00, category: 'Parrillas', available: true, requiresKitchen: true },

  // 🍔 Hamburguesas & Sánduches
  { name: 'Choripán Grill', description: 'Pan tipo baguette tostado, chorizo a la parrilla, chimichurri y tomate fresco.', sellPrice: 8.50, category: 'Sánduches', available: true, requiresKitchen: true },
  { name: 'Hamburguesa Parrilla', description: 'Carne de res molida a la parrilla, queso gouda, lechuga, tomate y cebolla caramelizada.', sellPrice: 11.00, category: 'Sánduches', available: true, requiresKitchen: true },
  { name: 'Sánduche de Pollo Grill', description: 'Pechuga de pollo a la plancha, lechuga, tomate, mayonesa y mostaza.', sellPrice: 9.50, category: 'Sánduches', available: true, requiresKitchen: true },

  // 🥗 Acompañantes
  { name: 'Papas Fritas', description: 'Porción generosa de papas fritas crocantes con sal marina.', sellPrice: 4.00, category: 'Acompañantes', available: true, requiresKitchen: true },
  { name: 'Yuca Frita', description: 'Yuca tierna frita hasta dorar, servida con salsa criolla.', sellPrice: 4.50, category: 'Acompañantes', available: true, requiresKitchen: true },
  { name: 'Ensalada Mixta', description: 'Lechuga, tomate, cebolla morada, zanahoria y aderezo de la casa.', sellPrice: 5.00, category: 'Acompañantes', available: true, requiresKitchen: true },
  { name: 'Arroz Blanco', description: 'Porción de arroz blanco esponjoso.', sellPrice: 2.50, category: 'Acompañantes', available: true, requiresKitchen: true },
  { name: 'Tajadas de Plátano', description: 'Tajadas de plátano maduro fritas, dulces y crocantes.', sellPrice: 3.50, category: 'Acompañantes', available: true, requiresKitchen: true },

  // 🥣 Entradas
  { name: 'Tabla de Embutidos', description: 'Selección de jamón, salame, quesos maduros y pan artesanal.', sellPrice: 14.00, category: 'Entradas', available: true, requiresKitchen: true },
  { name: 'Morcilla al Carbón', description: 'Morcilla artesanal a la parrilla, acompañada de chimichurri verde.', sellPrice: 7.00, category: 'Entradas', available: true, requiresKitchen: true },
  { name: 'Provoleta Gratinada', description: 'Queso provolone a la parrilla con orégano y aceite de oliva.', sellPrice: 8.00, category: 'Entradas', available: true, requiresKitchen: true },

  // 🥤 Bebidas
  { name: 'Refresco 350ml', description: 'Lata de refresco fría a elección (Cola, Naranja, Limón, Agua tónica).', sellPrice: 2.00, category: 'Bebidas', available: true, requiresKitchen: false },
  { name: 'Agua Mineral 500ml', description: 'Agua mineral sin gas, bien fría.', sellPrice: 1.50, category: 'Bebidas', available: true, requiresKitchen: false },
  { name: 'Jugo Natural', description: 'Jugo de frutas naturales del día (preguntar disponibilidad).', sellPrice: 3.50, category: 'Bebidas', available: true, requiresKitchen: false },
  { name: 'Cerveza Nacional', description: 'Cerveza fría nacional 355ml, a elección.', sellPrice: 3.00, category: 'Bebidas', available: true, requiresKitchen: false },
  { name: 'Cerveza Importada', description: 'Cerveza importada premium 330ml, bien fría.', sellPrice: 5.00, category: 'Bebidas', available: true, requiresKitchen: false },

  // 🍮 Postres
  { name: 'Flan Casero', description: 'Flan de vainilla hecho en casa con caramelo artesanal.', sellPrice: 4.00, category: 'Postres', available: true, requiresKitchen: false },
  { name: 'Helado 2 Bolas', description: 'Dos bolas de helado artesanal a elección con toppings opcionales.', sellPrice: 3.50, category: 'Postres', available: true, requiresKitchen: false },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB.");

    const existing = await Product.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Ya existen ${existing} productos. Limpiando e insertando de nuevo...`);
      await Product.deleteMany({});
    }

    const resultado = await Product.insertMany(productos);
    console.log(`✅ ¡${resultado.length} productos insertados exitosamente!\n`);

    // Resumen por categoría
    const byCat = {};
    productos.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
    console.log("📋 Resumen por categoría:");
    console.table(
      Object.entries(byCat).map(([cat, count]) => ({ Categoría: cat, Productos: count }))
    );

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seed();
