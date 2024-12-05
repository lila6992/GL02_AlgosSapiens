const fs = require('fs');
const path = require('path');
const TEMP_STORAGE_PATH = path.join(__dirname, 'temp_search_results.json');
const PERSONAL_COLLECTION_PATH = path.join(__dirname, 'personal_collection.json');
const cli = require('@caporal/core').default;
const {Question, CollectionQuestion } = require('./Question');
const dataFolderPath = path.join(__dirname, 'SujetB_data');
let rechercheResultats = null;
const collectionPersonnelle = new CollectionQuestion();

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // Commande `list` pour afficher toutes les questions parsées
    .command('list', 'Afficher toutes les questions parsées')
    .action(({ logger }) => {
        try {
            const collection = CollectionQuestion.chargerDepuisDossier(dataFolderPath);
            collection.questions.forEach((question, index) => {
                logger.info(`\n[Question ${index + 1}]`);
                logger.info(`Titre : ${question.titre}`);
                logger.info(`Texte : ${question.texte}`);
                logger.info(`Type : ${question.typeDeQuestion}`);
                logger.info(`Réponses possibles : ${question.reponses.join(', ')}`);
                logger.info(`Bonne(s) réponse(s) : ${question.bonnesReponses.join(', ')}`);
            });

            if (collection.questions.length === 0) {
                logger.info("Aucune question trouvée dans les fichiers du dossier.");
            }
        } catch (error) {
            logger.error(`Erreur lors du chargement des questions : ${error.message}`);
        }
    })

    .command('search', 'Rechercher des questions par mot-clé')
    .argument('<motCle>', 'Mot-clé pour rechercher des questions')
    .action(({ logger, args }) => {
        try {
            const collection = CollectionQuestion.chargerDepuisDossier(dataFolderPath);
            const resultats = collection.rechercher(args.motCle);
    
            // Save search results to a temp file
            fs.writeFileSync(TEMP_STORAGE_PATH, JSON.stringify(resultats.questions), 'utf-8');
    
            if (resultats.questions.length === 0) {
                logger.info(`Aucune question trouvée pour le mot-clé : "${args.motCle}".`);
            } else {
                logger.info(`Nombre de résultats : ${resultats.questions.length}`);
                resultats.questions.forEach((question, index) => {
                    logger.info(`\n[Résultat ${index + 1}]`);
                    logger.info(`Titre : ${question.titre}`);
                    logger.info(`Texte : ${question.texte}`);
                    logger.info(`Type : ${question.typeDeQuestion}`);
                    logger.info(`Réponses possibles : ${question.reponses.join(', ')}`);
                    logger.info(`Bonne(s) réponse(s) : ${question.bonnesReponses.join(', ')}`);
                });
            }
        } catch (error) {
            logger.error(`Erreur lors de la recherche : ${error.message}`);
        }
    })
    
    .command('view', 'Afficher les questions dans la collection personnelle')
    .action(({ logger }) => {
        try {
            // Load collection from file
            let questions = [];
            if (fs.existsSync(PERSONAL_COLLECTION_PATH)) {
                const rawData = fs.readFileSync(PERSONAL_COLLECTION_PATH, 'utf-8');
                questions = JSON.parse(rawData).map(q => 
                    new Question(q.titre, q.texte, q.reponses, q.bonnesReponses, q.typeDeQuestion)
                );
            }
    
            if (questions.length === 0) {
                logger.info("Aucune question dans la collection personnelle.");
            } else {
                questions.forEach((question, index) => {
                    logger.info(`\n[Question ${index + 1}]`);
                    logger.info(`Titre : ${question.titre}`);
                    logger.info(`Texte : ${question.texte}`);
                    logger.info(`Type : ${question.typeDeQuestion}`);
                    logger.info(`Réponses possibles : ${question.reponses.join(', ')}`);
                    logger.info(`Bonne(s) réponse(s) : ${question.bonnesReponses.join(', ')}`);
                });
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // Modify the add command
    .command('add', 'Ajouter une question à la collection personnelle depuis les résultats de recherche')
    .argument('<index>', 'Indice de la question à ajouter (basé sur les résultats de search)')
    .action(({ logger, args }) => {
        try {
            // Check if temp storage file exists
            if (!fs.existsSync(TEMP_STORAGE_PATH)) {
                throw new Error("Aucun résultat de recherche disponible. Lancez d'abord une commande `search`.");
            }
    
            // Read the saved search results
            const savedResults = JSON.parse(fs.readFileSync(TEMP_STORAGE_PATH, 'utf-8'));
    
            const questionIndex = parseInt(args.index, 10) - 1; // Indices 1-based
    
            if (questionIndex < 0 || questionIndex >= savedResults.length) {
                throw new Error(`Indice ${args.index} invalide. Assurez-vous qu'il est compris entre 1 et ${savedResults.length}.`);
            }
    
            const question = new Question(
                savedResults[questionIndex].titre,
                savedResults[questionIndex].texte,
                savedResults[questionIndex].reponses,
                savedResults[questionIndex].bonnesReponses,
                savedResults[questionIndex].typeDeQuestion
            );
    
            // Load existing collection
            let collection = [];
            if (fs.existsSync(PERSONAL_COLLECTION_PATH)) {
                collection = JSON.parse(fs.readFileSync(PERSONAL_COLLECTION_PATH, 'utf-8'));
            }
    
            // Check if question already exists
            if (!collection.some(q => q.titre === question.titre)) {
                collection.push(question);
                fs.writeFileSync(PERSONAL_COLLECTION_PATH, JSON.stringify(collection), 'utf-8');
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
            if (fs.existsSync(PERSONAL_COLLECTION_PATH)) {
                collection = JSON.parse(fs.readFileSync(PERSONAL_COLLECTION_PATH, 'utf-8'));
            }
    
            // Filter out the question
            const initialLength = collection.length;
            collection = collection.filter(q => q.titre !== args.titre);
    
            if (collection.length < initialLength) {
                fs.writeFileSync(PERSONAL_COLLECTION_PATH, JSON.stringify(collection), 'utf-8');
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
            if (fs.existsSync(PERSONAL_COLLECTION_PATH)) {
                const rawData = fs.readFileSync(PERSONAL_COLLECTION_PATH, 'utf-8');
                collection = JSON.parse(rawData).map(q => 
                    new Question(q.titre, q.texte, q.reponses, q.bonnesReponses, q.typeDeQuestion)
                );
            }
    
            const nombreQuestions = collection.length;
    
            if (nombreQuestions < 15) {
                throw new Error(`L'examen doit contenir au moins 15 questions. Actuellement : ${nombreQuestions}.`);
            } else if (nombreQuestions > 20) {
                throw new Error(`L'examen ne peut pas contenir plus de 20 questions. Actuellement : ${nombreQuestions}.`);
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