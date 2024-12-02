const fs = require('fs');
const path = require('path');
const colors = require('colors'); // Importation du module colors
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

const folderPath = 'C:/projects/GL02/Projet/GL02_AlgosSapiens/SujetB_data';

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // Commande 'list'
    .command('list', 'Afficher toutes les questions')
    .action(({ logger }) => {
        const questions = loadQuestions(folderPath);
        logger.info('Liste de toutes les questions :\n');
        questions.forEach((question, index) => {
            logger.info(`Question ${index + 1}:\n`);
            logger.info(`\tTitre : ${question.title}`);
            logger.info(`\tContenu : ${question.content}`);
            logger.info(`\tType : ${question.type}`);
            logger.info(`\tFichier source : ${question.file}`);
            logger.info(`\tRéponses :`);
            question.answers.forEach(answer => {
                logger.info(`\t\t${answer.correct ? '✔️'.green : '❌'.red} ${answer.text}`);
            });
            logger.info('\n');
        });
    })

    // Commande 'search'
    .command('search', 'Rechercher des fichiers contenant des questions par mot-clé dans les titres')
    .argument('<keyword>', 'Mot-clé à rechercher')
    .action(({ args, logger }) => {
        const keyword = args.keyword.toLowerCase();
        const questions = loadQuestions(folderPath);

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
        const filePath = path.join(folderPath, args.file);

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

