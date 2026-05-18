const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://clickstore:Gior*1798$2022@clickstore-pruebas.ipkzfs3.mongodb.net/casaparrilla?retryWrites=true&w=majority');
  
  const Ingredient = mongoose.model('Ingredient', new mongoose.Schema({}, { strict: false }));
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const ingredients = await Ingredient.find().lean();
  const products = await Product.find().lean();
  const fixedExpenses = await mongoose.connection.db.collection('fixedexpenses').find().toArray();
  const employees = await mongoose.connection.db.collection('employees').find().toArray();

  const data = {
    ingredients,
    products,
    fixedExpenses,
    employees
  };
  
  const fs = require('fs');
  fs.writeFileSync('/tmp/casa_parrilla_data.json', JSON.stringify(data, null, 2));
  console.log("Analysis saved to /tmp/casa_parrilla_data.json");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
