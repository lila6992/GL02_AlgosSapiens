const fs = require('fs');
const path = require('path');
const GiftParser = require('./GiftParser');  // Utilisation du GiftParser
const cli = require('@caporal/core').default;

// Le dossier des fichiers GIFT est maintenant correctement défini
const folderPath = 'C:/projects/GL02/Projet/GL02_AlgosSapiens/SujetB_data';

cli
  .version('gift-parser-cli')
  .description('Un outil CLI pour analyser des fichiers GIFT et effectuer des recherches sur les questions')

  // Commande pour vérifier tous les fichiers GIFT du dossier
  .command('check', 'Vérifier si tous les fichiers GIFT du dossier sont valides')
  .option('-s, --showSymbols', 'Afficher les symboles analysés à chaque étape', { validator: cli.BOOLEAN, default: false })
  .option('-t, --showTokenize', 'Afficher les résultats de la tokenisation', { validator: cli.BOOLEAN, default: false })
  .action(({ options, logger }) => {
    // Lecture du contenu du dossier SujetB_data
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        return logger.error(`Erreur lors de la lecture du dossier : ${err}`);
      }

      // Liste pour stocker les fichiers valides et invalides
      let validFiles = [];
      let invalidFiles = [];

      // Pour chaque fichier du dossier, on va essayer de l'analyser
      files.forEach(file => {
        const filePath = path.join(folderPath, file);

        // On vérifie si c'est bien un fichier GIFT en lisant son contenu
        fs.readFile(filePath, 'utf8', function (err, data) {
          if (err) {
            invalidFiles.push({ file, error: err });
            return logger.warn(`Erreur de lecture du fichier ${file}: ${err}`);
          }

          // Création d'une instance de GiftParser et analyse du fichier
          var parser = new GiftParser(options.showTokenize, options.showSymbols);

          try {
            parser.parse(data);

            // Vérification du résultat du parsing
            if (parser.errorCount === 0) {
              validFiles.push(file);  // Ajoute les fichiers valides à la liste
            } else {
              invalidFiles.push({ file, errors: parser.errors });
            }
          } catch (parseError) {
            invalidFiles.push({ file, errors: [parseError.message] });
            logger.warn(`Erreur de parsing dans le fichier ${file}: ${parseError.message}`);
          }

          // Affichage des résultats après avoir traité tous les fichiers
          if (files.indexOf(file) === files.length - 1) { // Vérifier si c'est le dernier fichier
            if (validFiles.length > 0) {
              logger.info("Les fichiers GIFT valides :".green);
              validFiles.forEach(validFile => logger.info(`${validFile} est valide`.green));
            } else {
              logger.info("Aucun fichier GIFT valide.".red);
            }

            if (invalidFiles.length > 0) {
              logger.info("Les fichiers GIFT invalides :".red);
              invalidFiles.forEach(({ file, errors }) => {
                logger.info(`${file} n'est PAS valide`.red);
                errors.forEach(error => logger.info(`  - Erreur: ${error}`.red));
              });
            } else {
              logger.info("Tous les fichiers sont valides.".green);
            }
          }
        });
      });
    });
  })

cli.run(process.argv.slice(2));
