const fs = require('fs');
const path = require('path');
const colors = require('colors'); // Importation du module colors
const GiftParser = require('./GiftParser');
const { Question, loadQuestions } = require('./Question');
const cli = require('@caporal/core').default;

// Fonction améliorée pour analyser les réponses
function parseAnswers(rawAnswers) {
    const answers = rawAnswers.split(/[#=~]/).filter(Boolean).map(answer => answer.trim());
    return answers.map(answer => {
        // Assurer qu'on marque correctement la réponse correcte
        return {
            text: answer || "Réponse manquante", // Gère les réponses vides
            correct: answer.includes('=') // Identifie la réponse correcte avec '='
        };
    });
}

const dataFolderPath =  path.join(__dirname, 'SujetB_data');

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

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
  

    // Commande 'list'
    .command('list', 'Afficher toutes les questions')
    .action(({ logger }) => {
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

                const parser = new GiftParser();
                parser.parse(data, file); 

                const parsedQuestions = parser.parse(data, file);
                parsedQuestions.forEach((question, index) => {
                  // console.log(JSON.stringify(question, null, 2));
                  console.log(`\n`);
                  logger.info(`\tID : ${String(question.id)}`);
                  logger.info(`\tFichier source : ${question.file}`);
                  logger.info(`\tQuestion : ${String(question.questionIndex)}`);
                  logger.info(`\tTitre : ${String(question.title)}`);
                  logger.info(`\tType : ${question.type}`);
                  logger.info(`\tEnoncé : ${question.statement}`);
              
                  if (Array.isArray(question.answer) && question.answer.length > 0) {
                      logger.info("\tRéponses :");
                      question.answer.forEach(ans => {
                          logger.info(`\t\t ✔️ ${ans}`);
                      });
                  }
              
                  if (Array.isArray(question.choice) && question.choice.length > 0) {
                      logger.info("\tAutres choix :");
                      question.choice.forEach(indivChoice => {
                          logger.info(`\t\t❌ ${indivChoice}`);
                      });
                  }
              
                });
            });
        });
    });
    })

    // Commande 'search'
    .command('search', 'Rechercher des fichiers contenant des questions par mot-clé dans les titres')
    .argument('<keyword>', 'Mot-clé à rechercher')
    .action(({ args, logger }) => {
        const keyword = args.keyword.toLowerCase();
        const questions = loadQuestions(dataFolderPath);

        const filesWithMatches = questions
            .filter(q => q.title.toLowerCase().includes(keyword))
            .reduce((acc, q) => {
                acc[q.file] = acc[q.file] || [];
                acc[q.file].push(q);
                return acc;
            }, {});

        if (Object.keys(filesWithMatches).length === 0) {
            logger.info(`Aucun fichier contenant des questions avec le mot-clé "${args.keyword}".`);
        } else {
            logger.info(`Fichiers correspondant à "${args.keyword}":`);
            Object.keys(filesWithMatches).forEach((file, index) => {
                logger.info(`${index + 1}. ${file}`);
            });

            logger.info('\nUtilisez la commande "explore <file>" pour afficher les questions du fichier sélectionné.');
        }
    })

    // Commande 'explore'
    .command('explore', 'Explorer toutes les questions d’un fichier spécifique')
    .argument('<file>', 'Nom du fichier à explorer')
    .action(({ args, logger }) => {
        const filePath = path.join(dataFolderPath, args.file);

        if (!fs.existsSync(filePath)) {
            logger.error(`Le fichier "${args.file}" n'existe pas.`);
            return;
        }

        const data = fs.readFileSync(filePath, 'utf8');

        // Extraire les consignes ou le paragraphe introductif (avant les questions)
        const introductionPattern = /^(.*?)(?=\n::)/s;
        const introductionMatch = data.match(introductionPattern);

        if (introductionMatch) {
            logger.info(`Introduction du fichier "${args.file}":\n`);
            logger.info(introductionMatch[1].trim() + '\n');
        }

        // Extraction des questions
        const giftPattern = /::(.*?)::(.*?)\{([\s\S]*?)\}/g;
        let match, index = 1;

        logger.info(`Questions dans le fichier "${args.file}":\n`);
        while ((match = giftPattern.exec(data)) !== null) {
            const title = match[1].trim();
            const content = match[2].trim();
            const rawAnswers = match[3].trim();
            const answers = parseAnswers(rawAnswers);

            logger.info(`Question ${index++}:\n`);
            logger.info(`\tTitre : ${title}`);
            logger.info(`\tContenu : ${content}`);

            // Vérification si la question a des réponses valides
            if (answers.length === 0) {
                logger.info('\t\t{❌ Réponse manquante}');
            } else {
                logger.info(`\tRéponses :`);
                answers.forEach(answer => {
                    logger.info(`\t\t${answer.correct ? '✔️'.green : '❌'.red} ${answer.text}`);
                });
            }
            logger.info('\n');
        }
    });

cli.run(process.argv.slice(2));

