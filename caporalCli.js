const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cli = require('@caporal/core').default;

const dataFolderPath = path.join(__dirname, 'data', 'gift');
const personalCollectionPath = path.join(__dirname, 'data', 'personal_collection.json');
const tempStoragePath = path.join(__dirname, 'data', 'temp_selected_questions.json');

const CollectionQuestions = require('./CollectionQuestions');
const {Question, CollectionQuestion } = require('./Question');

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // check
    .command('check', 'Vérifier si tous les fichiers GIFT du dossier sont valides')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .option('-f, --format', 'Vérifier le formattage du fichier gift', { validator: cli.BOOLEAN, default: false })
    .action(({ args, options, logger }) => {
        const collectionPath = path.join(dataFolderPath, `${args.collection}.gift`);
        try {
            const collectionQuestions = new CollectionQuestions();
            const data = fs.readFileSync(collectionPath, 'utf8'); 
            const questions = collectionQuestions.chargeExamQuestions(data, collectionPath, false);
            if (options.format) {
                collectionQuestions.chargeExamQuestions(data, collectionPath, true); 
            }
            collectionQuestions.verifyQuality(questions);
        } catch (err) {
            console.error('Erreur de lecture du fichier :', err);
            return 0; 
        }
    })

    // list
    .command('list', 'Afficher toutes les questions')
    .action(({ logger }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false);
            collectionQuestions.logQuestions(allQuestions); 
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })

    //view
    .command('view', 'Afficher les questions dans la collection personnelle')
    .action(({ logger }) => {
        try {
            const file = 'personal_collection.json';
            let questions = [];
            if (fs.existsSync(personalCollectionPath)) {
                fs.readFile(personalCollectionPath, 'utf8', (err, data) => {
                    if (err) {
                        return logger.warn(`Erreur de lecture du fichier ${file}: ${err}`);
                    }
                    const collectionQuestions = new CollectionQuestions();
                    const questions = collectionQuestions.chargeExamQuestions(data, file, false); 
                    console.log('La collection personnelle :')
                    collectionQuestions.logQuestions(questions); 
                });
            } else {
                console.log(`Le fichier de collection personnelle n est pas trouvable à l adresse suivante : ${chalk.red(personalCollectionPath)}`);
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })

    // explore
    .command('explore', 'Afficher les questions dans la collection personnelle')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .action(({ logger, args }) => {
        const collectionPath = path.join(dataFolderPath, `${args.collection}.gift`);
        try {
            const collectionQuestions = new CollectionQuestions();
            const data = fs.readFileSync(collectionPath, 'utf8'); 
            const questions = collectionQuestions.chargeExamQuestions(data, collectionPath, false);
            collectionQuestions.logQuestions(questions); 
        } catch (err) {
            console.error('Erreur de lecture du fichier :', err);
            return 0; 
        }
    })

    // countain
    .command('countain', 'Affiche si la question est comprise dans la collection')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .argument('<id>', 'ID de la question')
    .action(({ logger, args }) => {
        const collectionPath = path.join(dataFolderPath, `${args.collection}.gift`);
        try {
            const collectionQuestions = new CollectionQuestions();
            const data = fs.readFileSync(collectionPath, 'utf8'); // Lecture synchronisée du fichier
            const questions = collectionQuestions.chargeExamQuestions(data, collectionPath, false);
            const isContained = collectionQuestions.contientQuestions(questions, args.id);
            if (isContained) {
                logger.info(`La question avec l'ID "${args.id}" est présente dans la collection "${args.collection}".`);
            } else {
                logger.info(`La question avec l'ID "${args.id}" n'est PAS présente dans la collection "${args.collection}".`);
            }
        } catch (err) {
            logger.error('Erreur de lecture du fichier :', err);
        }
    })

    // count
    .command('count', 'Compter le nombre de questions dans une collection')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .action( ({ logger, args }) => {
        try {   
            const collectionQuestions = new CollectionQuestions();
            const nbQuestions = collectionQuestions.compterQuestions(args.collection);
            console.log(chalk.bold(`Total de questions dans la collection ${args.collection} : `) + chalk.gray(nbQuestions));
        } catch (error) {
            logger.error(`Erreur lors de la recherche : ${error.message}`);
        }
    })
   
    // search
    .command('search', 'Rechercher des questions par mot-clé')
    .argument('<motCle>', 'Mot-clé pour rechercher des questions')
    .action( ({ logger, args }) => {
        try {   
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false);
            logger.info(`Total questions chargées : ${allQuestions.length}`);
            const searchResults = collectionQuestions.search(allQuestions, args.motCle);
            if (searchResults.length === 0) {
                logger.info(`Aucune question trouvée pour le mot-clé : "${args.motCle}".`);
            } else {
                logger.info(`Nombre de résultats : ${searchResults.length}`);
                collectionQuestions.logQuestions(searchResults);
            }
        } catch (error) {
            logger.error(`Erreur lors de la recherche : ${error.message}`);
        }
    })
    
    // select
    .command('select', 'Sélectionner des ID et charger les questions')
    .argument('<id>', 'ID 1')
    .action(({ logger, args }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false);
            collectionQuestions.selectQuestionsFromId(allQuestions, args.id);
        } catch (error) {
        logger.error(`Erreur lors de la sélection des questions : ${error.message}`);
        }
    })

    // clear-selected
    .command('clear-selected', 'Vider le contenu du fichier temporaire sans le supprimer')
    .action(({ logger }) => {
        try {
            // Vider le fichier tempStoragePath
            fs.writeFileSync(tempStoragePath, '', 'utf8');
            logger.info('Le fichier temporaire a été vidé.');
        } catch (error) {
            logger.error(`Erreur lors de la tentative de vider le fichier temporaire : ${error.message}`);
        }
    })
    
    // add-selected
    .command('add-selected', 'Ajouter les questions sélectionnées d\'une collection spécifique')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .action(({ logger, args }) => {
        try {  
            const collectionQuestions = new CollectionQuestions();
            const collectionPath = path.join(__dirname, 'data', 'gift', `${args.collection}.gift`); 
            collectionQuestions.ajouterQuestions(collectionPath);
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // remove-selected
    .command('remove-selected', 'Retirer les questions sélectionnées d\'une collection spécifique')
    .argument('<collection>', 'Nom complet sans extension du fichier de collection')
    .action(({ logger, args }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            const collectionPath = path.join(__dirname, 'data', 'gift', `${args.collection}.gift`); 
            collectionQuestions.removeQuestions(collectionPath); 
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })

    // create-collection
	.command('create-collection', 'Créer un fichier GIFT à partir des questions sélectionnées')
	.argument('<collection>', 'le nom de l\'examen')
	.action(({ args }) => {
        const collectionQuestions = new CollectionQuestions();
        collectionQuestions.createCollection(args.collection);
	});

cli.run(process.argv.slice(2));