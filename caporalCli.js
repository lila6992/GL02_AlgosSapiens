const fs = require('fs');
const path = require('path');
const GiftParser = require('./GiftParser'); // Assurez-vous que GiftParser est dans le même dossier
const cli = require('@caporal/core').default;

const dataFolderPath = path.join(__dirname, 'SujetB_data'); 

cli
  .version('gift-parser-cli')
  .description('Un outil CLI pour analyser des fichiers GIFT et effectuer des recherches sur les questions')

  .command('check', 'Vérifier si tous les fichiers GIFT du dossier sont valides')
  .option('-s, --showSymbols', 'Afficher les symboles analysés à chaque étape', { validator: cli.BOOLEAN, default: false })
  .option('-t, --showTokenize', 'Afficher les résultats de la tokenisation', { validator: cli.BOOLEAN, default: false })
  .action(({ options, logger }) => {
    fs.readdir(dataFolderPath, (err, files) => {
      if (err) {
        return logger.error(`Erreur lors de la lecture du dossier : ${err}`);
      }

      files.forEach(file => {
        const filePath = path.join(dataFolderPath, file);
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            return logger.warn(`Erreur de lecture du fichier ${file}: ${err}`);
          }

          const parser = new GiftParser(options.showTokenize, options.showSymbols);
          parser.parse(data, file); // On passe le nom du fichier au parser pour l'afficher dans les erreurs
        });
      });
    });
  })

cli.run(process.argv.slice(2));
