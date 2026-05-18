const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/casa_parrilla_data.json', 'utf8'));

const { ingredients, products, fixedExpenses, employees } = data;

// 1. Map ingredients & calculate total inventory cost
const ingredientMap = new Map();
let totalInventoryValue = 0;

ingredients.forEach(ing => {
  ingredientMap.set(ing._id.toString(), ing);
  ingredientMap.set(ing.name, ing);
  totalInventoryValue += (ing.unitCost * ing.currentStock);
});

// 2. Calculate overhead (Monthly Fixed Expenses + Payroll)
let totalFixedExpenses = 0;
fixedExpenses.forEach(exp => {
  totalFixedExpenses += exp.amount;
});

let totalPayroll = 0;
employees.forEach(emp => {
  totalPayroll += emp.salary;
});

let totalOverhead = totalFixedExpenses + totalPayroll;

// 3. Process products
let productAnalysis = [];

products.forEach(prod => {
  let recipeCost = 0;
  let unknownIngredients = false;

  if (prod.recipe && prod.recipe.length > 0) {
    prod.recipe.forEach(item => {
      let ing = ingredientMap.get(item.ingredientId?.toString()) || ingredientMap.get(item.ingredientName);
      if (ing) {
        recipeCost += (ing.unitCost * item.quantityRequired);
      } else {
        unknownIngredients = true;
      }
    });
  }

  // Find out the current margin (assuming USD base)
  let currentPrice = prod.sellPrice || 0;
  let margin = currentPrice > 0 ? ((currentPrice - recipeCost) / currentPrice) * 100 : 0;
  let profit = currentPrice - recipeCost;
  
  // Suggested price to hit 30% max food cost (70% margin)
  // Food Cost % = Recipe Cost / Sell Price => Sell Price = Recipe Cost / 0.3
  let suggestedPrice30 = recipeCost > 0 ? recipeCost / 0.3 : currentPrice;
  let suggestedPrice35 = recipeCost > 0 ? recipeCost / 0.35 : currentPrice;

  productAnalysis.push({
    name: prod.name,
    category: prod.category,
    currentPrice: currentPrice,
    recipeCost: recipeCost.toFixed(2),
    profit: profit.toFixed(2),
    marginPercent: margin.toFixed(1),
    suggestedPrice30: suggestedPrice30.toFixed(2),
    suggestedPrice35: suggestedPrice35.toFixed(2),
    hasRecipe: prod.recipe && prod.recipe.length > 0,
    unknownIngredients
  });
});

// Sort by margin ascending to find the biggest bleeders
productAnalysis.sort((a, b) => parseFloat(a.marginPercent) - parseFloat(b.marginPercent));

// 4. Generate Markdown
let md = `# Análisis de Rentabilidad y Precios - Casa Parrilla

## Resumen de Gastos Operativos (Overhead Mensual Estimado)
- **Gastos Fijos:** $${totalFixedExpenses.toFixed(2)}
- **Nómina:** $${totalPayroll.toFixed(2)}
- **Total Overhead Mensual:** $${totalOverhead.toFixed(2)}
- *Valor Total de Inventario Actual:* $${totalInventoryValue.toFixed(2)}

> [!NOTE]
> Para ser rentables, el margen bruto de ganancia de las ventas debe ser mayor a **$${totalOverhead.toFixed(2)}** cada mes. Si el margen de sus productos es bajo, es muy probable que se encuentren en "rojo" al no cubrir sus propios costos de operación.

## Análisis de Productos y Precios Sugeridos
En la industria gastronómica, el estándar es que el costo de los ingredientes (Food Cost) represente entre un **30% y un 35%** del precio de venta para poder tener un margen suficiente (65%-70%) que cubra los gastos operativos y deje ganancia neta.

A continuación, los productos clasificados por su margen actual (de menores ganancias a mayores):
`;

let tableHeader = `| Producto | Costo Receta ($) | Precio Actual ($) | Ganancia Bruta ($) | Margen Actual (%) | Precio Sugerido (35% Costo) | Precio Óptimo (30% Costo) |
|---|---|---|---|---|---|---|
`;
md += tableHeader;

let productosConProblemas = 0;
productAnalysis.forEach(p => {
  if (p.hasRecipe) {
    let flag = parseFloat(p.marginPercent) < 60 ? "🚨 " : (parseFloat(p.marginPercent) >= 70 ? "✅ " : "⚠️ ");
    if (parseFloat(p.marginPercent) < 65) productosConProblemas++;
    
    let notas = p.unknownIngredients ? "(?) Ingrediente no encontrado" : "";
    md += `| ${flag}${p.name} | ${p.recipeCost} | ${p.currentPrice} | ${p.profit} | **${p.marginPercent}%** | **$${p.suggestedPrice35}** | **$${p.suggestedPrice30}** |\n`;
  } else {
    // Si no tiene receta en BD, se asume que no hay datos para auditar
    md += `| ❓ ${p.name} | N/A | ${p.currentPrice} | N/A | N/A | N/A | N/A |\n`;
  }
});

md += `\n\n### Conclusiones y Diagnóstico
Actualmente tienen **${productosConProblemas}** productos que están operando con un margen bruto por debajo del **65%**. Si su mix de ventas se concentra en los productos con un margen del 20-50%, no les quedará dinero suficiente para cubrir los **$${totalOverhead.toFixed(2)}** de gastos fijos mensuales, originando operar en "rojo".

**Acción recomendada:**
1. **Ajuste de Precios:** Subir los precios a las métricas del "Precio Óptimo (30% Costo)". Esto multiplicará su ganancia bruta drásticamente.
2. **Revisión de Recetas:** Si ven productos en rojo pero ustedes confían en que son económicos, revísen las porciones de la receta reportadas en su sistema, pueden estar calculadas con más cantidad de ingredientes que la realidad.
3. **Control de Mermas:** Evalúen si hay pérdida de inventario no controlada.

*(Los items marcados con 🚨 están muy por debajo de un margen saludable, los ⚠️ están en el límite inferior, y los ✅ tienen un margen rentable del 70% o más.)*
`;

fs.writeFileSync('/tmp/analysis_results.md', md);
console.log("Markdown Report generated at artifacts dir.");
