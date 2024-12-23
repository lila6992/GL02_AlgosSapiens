const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cli = require('@caporal/core').default;
const vegaLite = require('vega-lite');

const { VCard, GestionVCard } = require('./vCard');

const dataFolderPath = path.join(__dirname, 'data', 'gift');
const tempStoragePath = path.join(__dirname, 'data', 'temp_selected_questions.json');

const CollectionQuestions = require('./CollectionQuestions');
const gestionVCard = new GestionVCard();

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // check
    .command('check', 'Vérifier si la collection sélectionnée est valide')
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
    // ex : node caporalCli.js -t qcm1
    .command('list', 'Afficher toutes les questions')
    .option('-t, --type <type>', 'Filtrer les questions par type', { validator: cli.STRING, default: '' }) // Ajout de l'option pour filtrer par type
    .action(({ logger, options }) => {
        try {
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false); // Charger toutes les questions
    
            // Log des types de questions
            logger.info("Types de questions présentes :");
            allQuestions.forEach(q => {
                logger.info(q.typeDeQuestion); // Affiche les types de questions
            });
    
            let filteredQuestions = allQuestions;
    
            // Si un type est spécifié, filtrer les questions par type
            if (options.type) {
                filteredQuestions = allQuestions.filter(q => q.typeDeQuestion === options.type);
            }
    
            // Afficher les questions filtrées
            if (filteredQuestions.length > 0) {
                collectionQuestions.logQuestions(filteredQuestions); 
            } else {
                logger.info(`Aucune question trouvée pour le type "${options.type}".`);
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    

    // explore
    .command('explore', 'Afficher les questions dans la collection')
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
    // ex : node caporalCli.js add examen_test
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
    // ex : node caporalCli.js create-collection examen-super-joli
	.command('create-collection', 'Créer un fichier GIFT à partir des questions sélectionnées')
	.argument('<collection>', 'le nom de l\'examen')
	.action(({ args }) => {
        const collectionQuestions = new CollectionQuestions();
        collectionQuestions.createCollection(args.collection);
	})

    // create-vcard
    .command('create-vcard', 'Générer un fichier vCard pour un enseignant')
    .argument('<nom>', 'Nom de l\'enseignant')
    .argument('<prenom>', 'Prénom de l\'enseignant')
    .argument('<email>', 'Adresse e-mail de l\'enseignant')
    .argument('<telephone>', 'Numéro de téléphone de l\'enseignant')
    .option('--organisation <organisation>', 'Nom de l\'organisation', {
        default: 'SRYEM',
    })
    
    .action(({ args, options, logger }) => {
        try {
            // Créer une instance de VCard
            const vcard = new VCard(
                args.nom,
                args.prenom,
                args.email,
                args.telephone,
                options.organisation
            );
    
            // Générer le nom du fichier à partir des propriétés de l'instance vCard
            const nomFichier = `${vcard.nom}_${vcard.prenom}`; 
    
            // Créer une instance de GestionVCard
            const gestionVCard = new GestionVCard();
    
            // Définir le chemin du fichier
            const cheminFichier = path.join(gestionVCard.dossierVCard, `${nomFichier}.vcf`);
    
            // Générer et sauvegarder la vCard
            gestionVCard.genererEtSauvegarder(vcard, nomFichier);
    
            logger.info(`Fichier vCard généré avec succès : ${cheminFichier}`);
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // stats
    // ex : node caporalCli.js stats examen_test
	.command('stats', "Générer les statistiques d'un examen à partir du fichier GIFT ")
	.argument('<collection>', 'le nom de l\'examen')
	.action(({logger, args }) => {
        try{
            const collectionQuestions = new CollectionQuestions();
            const stats = collectionQuestions.genererStats(args.collection);
            const type = Object.keys(stats);
            const nb = Object.values(stats);
            //console.log(stats)

            let listeValeurs = [];
            for (let i = 0; i < type.length; i++) {
                listeValeurs.push({"Type de question": type[i], "Nombre de question": nb[i]});
            }

            let vlSpec = {
                $schema: "https://vega.github.io/schema/vega-lite/v5.json",
                data: {
                  values: listeValeurs
                },
                mark: 'bar',
                encoding: {
                  x: {field: "Type de question", type: 'ordinal'},
                  y: {field: "Nombre de question", type: 'quantitative'}
                }
              };
            console.log("\n\n----- Code Vega-lite :")
            console.log(JSON.stringify(vlSpec, null, 2)); //On le mets en JSON pour avoir les vraies guillemets
              //var vgSpec = vegaLite.compile(vlSpec, logger).spec;
        }  catch (error) {
            logger.error(`Erreur lors de la recherche : ${error.message}`);
        }
        
	});

cli.run(process.argv.slice(2));