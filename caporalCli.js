const fs = require('fs');
const path = require('path');
const colors = require('colors');
const chalk = require('chalk');
const cli = require('@caporal/core').default;

const tempStoragePath = path.join(__dirname, 'data', 'temp_search_results.json');
const personalCollectionPath = path.join(__dirname, 'data', 'personal_collection.json');
const dataFolderPath = path.join(__dirname, 'data', 'gift');

const GiftParser = require('./GiftParser');
const CollectionQuestions = require('./CollectionQuestions');
const {Question, CollectionQuestion } = require('./Question');

let rechercheResultats = null;
const collectionPersonnelle = new CollectionQuestion();

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // check
    .command('check', 'Vérifier si tous les fichiers GIFT du dossier sont valides')
    .option('-s, --showSymbols', 'Afficher les symboles analysés à chaque étape', { validator: cli.BOOLEAN, default: false })
    .option('-t, --showTokenize', 'Afficher les résultats de la tokenisation', { validator: cli.BOOLEAN, default: false })
    .action(({ options, logger }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            collectionQuestions.chargeAllFolderQuestions(dataFolderPath, true);
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })

    // list
    .command('list', 'Afficher toutes les questions')
    .action(({ logger }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(dataFolderPath, false);
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
   
    // search
    .command('search', 'Rechercher des questions par mot-clé')
    .argument('<motCle>', 'Mot-clé pour rechercher des questions')
    .action( ({ logger, args }) => {
        try {   
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(dataFolderPath, false);
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
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(dataFolderPath, false);
            collectionQuestions.selectQuestionsFromId(allQuestions, args.id, tempStoragePath);
        } catch (error) {
        logger.error(`Erreur lors de la sélection des questions : ${error.message}`);
        }
    })
    
    // add
    // .command('add', 'Ajouter une question à la collection personnelle depuis les résultats de recherche')
    // .argument('<index>', 'Indice de la question à ajouter (basé sur les résultats de search)')
    // .action(({ logger, args }) => {
    //     try {
    //         // Check if temp storage file exists
    //         if (!fs.existsSync(tempStoragePath)) {
    //             throw new Error("Aucun résultat de recherche disponible. Lancez d'abord une commande `search`.");
    //         }
    
    //         // Read the saved search results
    //         const savedResults = JSON.parse(fs.readFileSync(tempStoragePath, 'utf-8'));
    
    //         const questionIndex = parseInt(args.index, 10) - 1; // Indices 1-based
    
    //         if (questionIndex < 0 || questionIndex >= savedResults.length) {
    //             throw new Error(`Indice ${args.index} invalide. Assurez-vous qu'il est compris entre 1 et ${savedResults.length}.`);
    //         }
    
    //         const question = new Question(
    //             savedResults[questionIndex].titre,
    //             savedResults[questionIndex].texte,
    //             savedResults[questionIndex].reponses,
    //             savedResults[questionIndex].bonnesReponses,
    //             savedResults[questionIndex].typeDeQuestion
    //         );
    
    //         // Load existing collection
    //         let collection = [];
    //         if (fs.existsSync(personalCollectionPath)) {
    //             collection = JSON.parse(fs.readFileSync(personalCollectionPath, 'utf-8'));
    //         }
    
    //         // Check if question already exists
    //         if (!collection.some(q => q.titre === question.titre)) {
    //             collection.push(question);
    //             fs.writeFileSync(personalCollectionPath, JSON.stringify(collection), 'utf-8');
    //             logger.info(`Question "${question.titre}" ajoutée à la collection personnelle.`);
    //         } else {
    //             logger.info(`La question "${question.titre}" existe déjà dans la collection.`);
    //         }
    //     } catch (error) {
    //         logger.error(`Erreur : ${error.message}`);
    //     }
    // })

    .command('add', 'Ajouter une question à la collection personnelle depuis les résultats de recherche')
    .argument('<id>', 'ID de la question à ajouter')
    .action(({ logger, args }) => {
        try {  
            // Read the saved search results
            if (fs.existsSync(tempStoragePath)) {
                fs.readFile(tempStoragePath, 'utf8', (err, data) => {
                    if (err) {
                        return logger.warn(`Erreur de lecture du fichier ${file}: ${err}`);
                    }
                    const parser = new GiftParser();
                    const searchResults = parser.parse(data, file);
                    if (searchResults.length === 0) {
                        console.log(chalk('Aucune question gardée en mémoire'))
                        return;
                    }
                });
            } else {
                console.log(`Le fichier temporaire contenant les résultats de recherche n est pas trouvable à l adresse suivante : ${chalk.red(personalCollectionPath)}`);
                return;
            }
    
            // Load existing collection
            let collection = [];
            if (fs.existsSync(personalCollectionPath)) {
                collection = JSON.parse(fs.readFileSync(personalCollectionPath, 'utf-8'));
            }
    
            // Check if question already exists
            if (!collection.some(q => q.titre === question.titre)) {
                collection.push(question);
                fs.writeFileSync(personalCollectionPath, JSON.stringify(collection), 'utf-8');
                logger.info(`Question "${question.titre}" ajoutée à la collection personnelle.`);
            } else {
                logger.info(`La question "${question.titre}" existe déjà dans la collection.`);
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // Modify the remove command
    .command('remove', 'Retirer une question de la collection personnelle')
    .argument('<titre>', 'Titre de la question à retirer')
    .action(({ logger, args }) => {
        try {
            // Load existing collection
            let collection = [];
            if (fs.existsSync(personalCollectionPath)) {
                collection = JSON.parse(fs.readFileSync(personalCollectionPath, 'utf-8'));
            }
    
            // Filter out the question
            const initialLength = collection.length;
            collection = collection.filter(q => q.titre !== args.titre);
    
            if (collection.length < initialLength) {
                fs.writeFileSync(personalCollectionPath, JSON.stringify(collection), 'utf-8');
                logger.info(`Question "${args.titre}" retirée de la collection personnelle.`);
            } else {
                logger.info(`Aucune question trouvée avec le titre "${args.titre}".`);
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // Modify the create command to use the persisted collection
    .command('create', 'Créer un fichier GIFT à partir de la collection personnelle')
    .argument('<nomFichier>', 'Nom du fichier GIFT (sans extension)')
    .action(({ logger, args }) => {
        try {
            // Load existing collection
            let collection = [];
            if (fs.existsSync(personalCollectionPath)) {
                const rawData = fs.readFileSync(personalCollectionPath, 'utf-8');
                collection = JSON.parse(rawData).map(q => 
                    new Question(q.titre, q.texte, q.reponses, q.bonnesReponses, q.typeDeQuestion)
                );
            }
    
            const nombreQuestions = collection.length;
    
            if (nombreQuestions < 15) {
                throw new Error(`L'collectionQuestions doit contenir au moins 15 questions. Actuellement : ${nombreQuestions}.`);
            } else if (nombreQuestions > 20) {
                throw new Error(`L'collectionQuestions ne peut pas contenir plus de 20 questions. Actuellement : ${nombreQuestions}.`);
            }
    
            const collectionPersonnelle = new CollectionQuestion();
            collection.forEach(q => collectionPersonnelle.ajouterQuestion(q));
            
            collectionPersonnelle.genererFichierGIFT(args.nomFichier);
            logger.info(`Fichier GIFT "${args.nomFichier}.gift" créé avec succès.`);
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    });

cli.run(process.argv.slice(2));