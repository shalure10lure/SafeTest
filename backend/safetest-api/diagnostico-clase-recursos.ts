const modulo = require("./src/migrations/1793900000000-RecursosPregunta");

console.log("Exportaciones disponibles:", Object.keys(modulo));

const nombres = Object.keys(modulo);

if (nombres.length !== 1) {
    throw new Error("Se esperaba exactamente una clase exportada.");
}

const Migracion = modulo[nombres[0]];

if (typeof Migracion !== "function") {
    throw new Error("La exportación no es una clase válida.");
}

const instancia = new Migracion();

console.log("Clase:", nombres[0]);
console.log("Constructor:", instancia.constructor.name);
console.log("Nombre:", instancia.name);
console.log("Método up:", typeof instancia.up);
console.log("Método down:", typeof instancia.down);

console.log("VERIFICACIÓN CORRECTA.");
