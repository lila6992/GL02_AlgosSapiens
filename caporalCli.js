const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cli = require('@caporal/core').default;
const vegaLite = require('vega-lite');
const inquirer = require('inquirer');

const { VCard, GestionVCard } = require('./vCard');

const dataFolderPath = path.join(__dirname, 'data', 'gift');
const tempStoragePath = path.join(__dirname, 'data', 'temp_selected_questions.json');

const CollectionQuestions = require('./CollectionQuestions');
const { id } = require('vega');
const gestionVCard = new GestionVCard();

cli
    .version('1.0.0')
    .description('Outil CLI pour gérer les fichiers GIFT')

    // check
    .command('check', 'Vérifier si la collection sélectionnée est valide')
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .option('-f, --format', 'Vérifier le formattage du fichier gift', { validator: cli.BOOLEAN, default: false })
    .action(async({ args, options, logger }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        const collectionPath = path.join(dataFolderPath, `${collectionName}.gift`);
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
                const typeQuestions = new Set();
                allQuestions.forEach(q => {
                    typeQuestions.add(q.typeDeQuestion); // Affiche les types de questions
                });
                logger.info("Types de questions présentes : "+ Array.from(typeQuestions).join(', '));
            }
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    

    // explore
    .command('explore', 'Afficher les questions dans la collection')
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .action(async({ logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        const collectionPath = path.join(dataFolderPath, `${collectionName}.gift`);
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
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .argument('[id]', 'ID de la question')
    .action(async({ logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        let idQuestion = args.id;
        if (!idQuestion) {
            const input2 = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'idQuestion',
                    message: 'Entrez l\'id de la question souhaitée :',
                },
            ]); 
            idQuestion=input2.idQuestion; 
        }

        const collectionPath = path.join(dataFolderPath, `${collectionName}.gift`);
        try {
            const collectionQuestions = new CollectionQuestions();
            const data = fs.readFileSync(collectionPath, 'utf8'); // Lecture synchronisée du fichier
            const questions = collectionQuestions.chargeExamQuestions(data, collectionPath, false);
            const isContained = collectionQuestions.contientQuestions(questions, idQuestion);
            if (isContained) {
                logger.info(`La question avec l'ID "${idQuestion}}" est présente dans la collection "${collectionName}".`);
            } else {
                logger.info(`La question avec l'ID "${idQuestion}" n'est PAS présente dans la collection "${collectionName}".`);
            }
        } catch (err) {
            logger.error('Erreur de lecture du fichier :', err);
        }
    })

    // count
    .command('count', 'Compter le nombre de questions dans une collection')
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .action( async({ logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        try {   
            const collectionQuestions = new CollectionQuestions();
            const nbQuestions = collectionQuestions.compterQuestions(collectionName);
            console.log(chalk.bold(`Total de questions dans la collection ${collectionName} : `) + chalk.gray(nbQuestions));
        } catch (error) {
            logger.error(`Erreur lors de la recherche : ${error.message}`);
        }
    })
   
    // search
    .command('search', 'Rechercher des questions par mot-clé')
    .argument('[motCle]', 'Mot-clé pour rechercher des questions')
    .action(async({ logger, args }) => {

        let motCle = args.motCle;
        if (!motCle) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'motCle',
                    message: 'Entrez le mot-clé pour rechercher des questions :',
                },
            ]); 
            motCle=input.motCle; 
        }
        try {   
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false);
            logger.info(`Total questions chargées : ${allQuestions.length}`);
            const searchResults = collectionQuestions.search(allQuestions, motCle);
            if (searchResults.length === 0) {
                logger.info(`Aucune question trouvée pour le mot-clé : "${motCle}".`);
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
    .argument('[id]', 'ID 1')
    .action(async({ logger, args }) => {

        let idQuestion = args.id;
        if (!idQuestion) {
            const input2 = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'idQuestion',
                    message: 'Entrez l\'id de la question souhaitée :',
                },
            ]); 
            idQuestion=input2.idQuestion; 
        }

        try {
            const collectionQuestions = new CollectionQuestions();
            const allQuestions = collectionQuestions.chargeAllFolderQuestions(false);
            collectionQuestions.selectQuestionsFromId(allQuestions, idQuestion);
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
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .action(async ({ logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        try {  
            const collectionQuestions = new CollectionQuestions();
            const collectionPath = path.join(__dirname, 'data', 'gift', `${collectionName}.gift`); 
            collectionQuestions.ajouterQuestions(collectionPath);
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })
    
    // remove-selected
    .command('remove-selected', 'Retirer les questions sélectionnées d\'une collection spécifique')
    .argument('[collection]', 'Nom complet sans extension du fichier de collection')
    .action(async({ logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }
        try {
            const collectionQuestions = new CollectionQuestions();
            const collectionPath = path.join(__dirname, 'data', 'gift', `${collectionName}.gift`); 
            collectionQuestions.removeQuestions(collectionPath); 
        } catch (error) {
            logger.error(`Erreur : ${error.message}`);
        }
    })

    // create-collection
    // ex : node caporalCli.js create-collection examen-super-joli
	.command('create-collection', 'Créer un fichier GIFT à partir des questions sélectionnées')
	.argument('[collection]', 'le nom de l\'examen')
	.action(async ({ args }) => {
        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        const collectionQuestions = new CollectionQuestions();
        collectionQuestions.createCollection(collectionName);
	})

    // create-vcard
    .command('create-vcard', 'Générer un fichier vCard pour un enseignant')
    
    .action(async({ args, options, logger }) => {

        const input = await inquirer.prompt([
            {
                type: 'input',
                name: 'nom',
                message: 'Entrez le nom de l\'enseignant :',
            },
            {
                type: 'input',
                name: 'prenom',
                message: 'Entrez le prénom de l\'enseignant :',
            },
            {
                type: 'input',
                name: 'email',
                message: 'Entrez l\'adresse e-mail de l\'enseignant :',
            },
            {
                type: 'input',
                name: 'telephone',
                message: 'Entrez le numéro de téléphone de l\'enseignant :',
            },
            {
                type:'input', 
                name:'organisation',
                message:'Entrez l\'organisation de l\'enseignant :',
            }
        ]);
        
        
        
        try {
            // Créer une instance de VCard
            const vcard = new VCard(
                input.nom,
                input.prenom,
                input.email,
                input.telephone,
                input.organisation
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
	.argument('[collection]', 'le nom de l\'examen')
	.action(async({logger, args }) => {

        let collectionName = args.collection;
        if (!collectionName) {
            const input = await inquirer.prompt([
                {
                    type: 'input', 
                    name: 'collectionName',
                    message: 'Entrez le nom de la collection :',
                },
            ]); 
            collectionName=input.collectionName; 
        }

        try{
            const collectionQuestions = new CollectionQuestions();
            const stats = collectionQuestions.genererStats(collectionName);
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