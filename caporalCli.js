const { program } = require("@caporal/core");
const fs = require("fs");
const VCardParser = require("./VCardParser"); // Importer le parser depuis votre fichier existant

program
  .version("1.0.0")
  .description("Vérifie si un fichier est au format GIFT")
  .argument("<fichier>", "Chemin vers le fichier à analyser")
  .action(({ args }) => {
    const { fichier } = args;

    // Vérifie si le fichier existe
    if (!fs.existsSync(fichier)) {
      console.error(`Erreur : Le fichier "${fichier}" n'existe pas.`);
      process.exit(1);
    }

    // Lire le contenu du fichier
    const data = fs.readFileSync(fichier, "utf8");

    // Crée une instance du parser
    const parser = new VCardParser(false, false);

    // Vérifie si le contenu est au format GIFT
    const isGift = parser.isGiftFormat(data);

    // Affiche le résultat
    if (isGift) {
      console.log(`Le fichier "${fichier}" est au format GIFT.`);
    } else {
      console.log(`Le fichier "${fichier}" n'est PAS au format GIFT.`);
    }
  });

// Lance le programme
program.run();
