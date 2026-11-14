const modulo = require("./src/migrations/1793900000000-RecursosPregunta");
const Migracion = modulo.RecursosPregunta1793900000000;

console.log("Exportaciones:", Object.keys(modulo));
console.log("Tipo:", typeof Migracion);

if (typeof Migracion !== "function") {
    throw new Error("La clase de migración no se pudo cargar.");
}

console.log("Clase de migración cargada correctamente.");
