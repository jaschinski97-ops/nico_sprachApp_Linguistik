// Stylesheets tragen im Testprozess keine Bedeutung: `theme.ts` importiert
// `global.css` nur, damit der Web-Build die Datei mitnimmt. Jest kann CSS nicht
// lesen und braucht es auch nicht - deshalb hier ein leeres Modul, statt den
// Import im Quelltext zu verbiegen.
module.exports = {};
