const fs = require('fs');
const writeFile = require('fs').promises.writeFile;
const chalk = require('chalk');
const path = require('path');
const GiftParser = require('./GiftParser');
const { match } = require('assert');

const dataFolderPath = path.join(__dirname, 'data', 'gift');
const tempStoragePath = path.join(__dirname, 'data', 'temp_selected_questions.json');

class CollectionQuestions {
    constructor(nomFichier) {
        this.nomFichier = nomFichier;
    }
    
    /**
     * Charge et parse les questions d'un fichier GIFT.
     * @param {string} data - Contenu du fichier en texte brut.
     * @param {string} collectionPath - Chemin du fichier pour des logs ou analyses supplémentaires.
     * @param {boolean} check - Indique si le format des questions doit être vérifié.
     * @returns {Array} - Liste des questions parsées.
     */
    chargeExamQuestions = function (data, collectionPath, check) {
        const parser = new GiftParser();
        parser.parse(data, collectionPath); 

        const parsedQuestions = parser.parse(data, collectionPath);
        if (check == true) {parser.checkFormat(collectionPath);}
        this.questions = parsedQuestions;
        return parsedQuestions;
    }

    /**
     * Charge toutes les questions des fichiers GIFT dans le dossier `data/gift`.
     * @param {boolean} check - Indique si le format des questions doit être vérifié.
     * @returns {Array} - Liste combinée de toutes les questions parsées.
     */
    chargeAllFolderQuestions(check) {
        try {
            const files = fs.readdirSync(dataFolderPath);
            const allQuestions = [];
    
            files.forEach((file) => {
                try {
                    const filePath = path.join(dataFolderPath, file);
                    const data = fs.readFileSync(filePath, 'utf8'); // Synchronous version of readFile
                    const fileQuestions = this.chargeExamQuestions(data, file, check); 
                    allQuestions.push(...fileQuestions); // Add questions to the list
                } catch (err) {
                    console.log(`Erreur de lecture du fichier ${file}: ${err.message}`);
                }
            });
    
            return allQuestions; 
        } catch (err) {
            console.log(`Erreur lors du traitement du dossier : ${err.message}`);
            return []; 
        }
    }
    
    /**
     * Affiche les informations détaillées d'une liste de questions.
     * @param {Array} questions - Liste des questions à afficher.
     */
    logQuestions = function (questions) {
        const transformType = (typeDeQuestion) => {
            switch (typeDeQuestion) {
                case 'qcm1':
                    return 'Choix multiples';
                case 'vrai_faux':
                    return 'Vrai ou faux';
                case 'numerique':
                    return 'Numérique';
                case 'mot_manquant':
                    return 'Mot manquant';
                default:
                    return typeDeQuestion.charAt(0).toUpperCase() + typeDeQuestion.slice(1);
            }
        };

        questions.forEach((question, index) => {
            console.log(`\n`);
            console.log(chalk.bold(`ID : `) + chalk.gray(String(question.id)));
            console.log(chalk.bold(`Titre : `) + chalk.gray(String(question.titre)));
            // console.log(chalk.bold(`formatGift : `) + chalk.gray(transformType(question.formatGift) || 'No format gift available'));
            console.log(chalk.bold(`typeDeQuestion : `) + chalk.gray(transformType(question.typeDeQuestion)));
            console.log(chalk.bold(`Enoncé : `) + chalk.gray(question.texte));
        
            if (Array.isArray(question.bonnesReponses) && question.bonnesReponses.length > 0) {
                console.log(chalk.bold("Bonnes réponses :"));
                question.bonnesReponses.forEach(ans => {
                    console.log(chalk.gray(`\t✔️ ${ans}`));
                });
            }
        
            if (Array.isArray(question.reponses) && question.reponses.length > 0) {
                console.log(chalk.bold("Choix de réponse :"));
                question.reponses.forEach(indivreponses => {
                    // Check if the indivreponse is in bonnesReponses
                    const isCorrect = question.bonnesReponses.includes(indivreponses);
                    
                    if (isCorrect) {
                        console.log(chalk.grey(`\t✔️ ${indivreponses}`));  // Correct answer with check mark
                    } else {
                        console.log(chalk.grey(`\t❌ ${indivreponses}`));  // Incorrect answer with cross
                    }
                });
            }
        });
    }

    /**
     * Recherche des questions contenant une clé dans leur titre ou énoncé.
     * @param {Array} questions - Liste des questions à filtrer.
     * @param {string} searchKey - Mot-clé de recherche.
     * @returns {Array} - Liste des questions correspondant à la recherche.
     */
    search(questions, searchKey) {
        return questions.filter(q => 
            (q.titre && q.titre.toLowerCase().includes(searchKey.toLowerCase())) ||
            (q.texte && q.texte.toLowerCase().includes(searchKey.toLowerCase()))
        );
    }

    /**
     * Compte le nombre de questions dans un fichier de collection.
     * @param {string} collectionName - Nom de la collection (sans extension).
     * @returns {number} - Nombre de questions dans la collection.
     */
    compterQuestions(collectionName) {
        const collectionPath = path.join(dataFolderPath, `${collectionName}.gift`);
        try {
            const data = fs.readFileSync(collectionPath, 'utf8'); // Synchronous file read
            const collectionQuestions = this.chargeExamQuestions(data, collectionPath, false);
            return collectionQuestions.length; 
        } catch (err) {
            console.error('Erreur de lecture du fichier :', err);
            return 0; 
        }
    }
    

    /**
     * Vérifie si une question avec l'ID donné existe dans une liste de questions.
     * @param {Array} questions - Liste des questions à examiner.
     * @param {string} id - ID de la question à rechercher.
     * @returns {boolean} - `true` si la question est trouvée, sinon `false`.
     */
    contientQuestions(questions, id) {
        return questions.some((question) => question?.id === id);
    }

     /**
     * Sélectionne des questions par ID et les stocke dans un fichier temporaire.
     * @param {Array} questions - Liste des questions disponibles.
     * @param {string} id - ID de la question à sélectionner.
     */
    selectQuestionsFromId = function (questions, id) {
        const filteredQuestions = questions.filter(question => question?.id === id);
        
        if (filteredQuestions.length === 0) {
            console.error(`Aucune question trouvée avec l'ID : ${id}`);
            return;
        }
    
        console.log('Question sélectionnée :');
        this.logQuestions(filteredQuestions);
    
        // Vérifier si le fichier existe
        fs.exists(tempStoragePath, (exists) => {
            if (exists) {
                fs.readFile(tempStoragePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Erreur de lecture du fichier :', err);
                        return;
                    }
    
                    let existingSelectedQuestions = [];
                    try {
                        existingSelectedQuestions = JSON.parse(data); // Parser les données existantes
                    } catch (e) {
                        console.error('Erreur de parsing JSON :', e);
                    }
    
                    // Vérifier si l'ID est déjà présent
                    const existingIds = new Set(existingSelectedQuestions.map(q => q.id));
                    const newQuestions = filteredQuestions.filter(q => !existingIds.has(q.id));
                    if (newQuestions.length === 0) {
                        console.error(`La question avec l'ID ${id} est déjà dans le fichier ${tempStoragePath}.`);
                        return;
                    }
    
                    // Ajouter uniquement les nouvelles questions
                    existingSelectedQuestions.push(...newQuestions);
    
                    // Réécrire le fichier avec les nouvelles questions
                    writeFile(tempStoragePath, JSON.stringify(existingSelectedQuestions, null, 2), 'utf8')
                        .then(() => {
                            console.log(`Question ajoutée dans : ${tempStoragePath}`);
                        })
                        .catch((error) => {
                            console.error('Erreur lors de l\'écriture dans le fichier :', error);
                        });
                });
            } else {
                // Si le fichier n'existe pas, créer un nouveau fichier et y écrire les questions
                writeFile(tempStoragePath, JSON.stringify(filteredQuestions, null, 2), 'utf8')
                    .then(() => {
                        console.log(`Résultats enregistrés dans : ${tempStoragePath}`);
                    })
                    .catch((error) => {
                        console.error('Erreur lors de l\'écriture dans le fichier :', error);
                    });
            }
        });
    };

    /**
     * Ajoute des questions à un fichier GIFT depuis un fichier temporaire.
     * @param {string} collectionPath - Chemin du fichier GIFT de destination.
     */
    ajouterQuestions(collectionPath) {
        fs.readFile(collectionPath, 'utf8', (err, existingData) => {
            if (err) {
                console.error('Erreur de lecture du fichier :', err);
                return;
            }
            const collectionQuestions = this.chargeExamQuestions(existingData, collectionPath, false);
    
            // Read the temporary storage
            fs.readFile(tempStoragePath, 'utf8', (err, data) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Erreur de lecture du fichier :', err);
                    return;
                }
    
                let selectedQuestions = [];
                if (data) {
                    try {
                        selectedQuestions = JSON.parse(data);
                    } catch (e) {
                        console.error('Erreur de parsing JSON :', e);
                        return;
                    }
                }
    
                if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
                    console.error('Aucune question sélectionnée dans le fichier temporaire.');
                    return;
                }

                // Filter out questions already in the collection
                const newQuestions = selectedQuestions.filter(newQ => 
                    !this.contientQuestions(collectionQuestions, newQ.id)
                );
    
                if (newQuestions.length === 0) {
                    console.log('Toutes les questions sélectionnées existent déjà dans la collection.');
                    return;
                }
    
                this.logQuestions(newQuestions);
    
                // Convert new questions to GIFT format
                const contenuGIFT = newQuestions.map(q => q.formatGift.startsWith('::') ? q.formatGift : `::${q.formatGift}`).join('\n\n');
    
                // Conditionally add newlines based on whether the file is empty
                const prefix = existingData.trim() === '' ? '' : '\n\n';
    
                // Append the new questions to the end of the existing collection file
                fs.appendFileSync(collectionPath, prefix + contenuGIFT, 'utf-8');
                console.log(`Nouvelles questions ajoutées au fichier GIFT : ${collectionPath}`);
            });
        });
    }


    /**
     * Retire des questions spécifiques d'une collection en utilisant un fichier temporaire.
     * @param {string} collectionPath - Chemin du fichier GIFT de destination.
     */
    removeQuestions(collectionPath) {
        // Read the collection file
        fs.readFile(collectionPath, 'utf8', (err, existingData) => {
            if (err) {
                console.error('Erreur de lecture du fichier de collection :', err);
                return;
            }
            const collectionQuestions = this.chargeExamQuestions(existingData, collectionPath, false);


            // Read the temporary storage
            fs.readFile(tempStoragePath, 'utf8', (err, tempData) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.error('Le fichier temporaire n\'existe pas.');
                    } else {
                        console.error('Erreur de lecture du fichier temporaire :', err);
                    }
                    return;
                }

                let selectedQuestions = [];
                if (tempData.trim()) {
                    try {
                        selectedQuestions = JSON.parse(tempData);
                    } catch (e) {
                        console.error('Erreur de parsing JSON du fichier temporaire :', e);
                        return;
                    }
                }

                if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
                    console.error('Aucune question sélectionnée dans le fichier temporaire.');
                    return;
                }

                // Filter out questions in the temp file from the collection
                const updatedCollection = collectionQuestions.filter(
                    (question) => !selectedQuestions.some(tempQ => tempQ.id === question.id)
                );

                if (updatedCollection.length === collectionQuestions.length) {
                    console.log('Aucune question correspondante trouvée à supprimer.');
                    return;
                }

                // Write back the updated collection
                const updatedData = JSON.stringify(updatedCollection, null, 2);
                fs.writeFile(collectionPath, updatedData, 'utf8', (err) => {
                    if (err) {
                        console.error('Erreur d\'écriture dans le fichier de collection :', err);
                        return;
                    }
                    console.log(`${collectionQuestions.length - updatedCollection.length} question(s) supprimée(s) du fichier : ${collectionPath}`);
                });
            });
        });
    }


    /**
     * Crée une nouvelle collection (fichier GIFT) et y ajoute des questions.
     * @param {string} collectionName - Nom de la nouvelle collection (sans extension).
     */
    createCollection(collectionName) {
        const filenames = fs.readdirSync(dataFolderPath);

        // Vérification que le fichier n'existe pas déjà
        if (filenames.includes(`${collectionName}.gift`)) {
            console.log(`L'examen ${collectionName}.gift existe déjà. Vous pouvez le retrouver ici :\n` +
                `${process.cwd()}/${dataFolderPath}${collectionName}.gift`);
            return;
        }

        // Création du fichier si nécessaire
        const collectionPath = `${dataFolderPath}/${collectionName}.gift`;
        fs.writeFile(collectionPath, "", "utf8", (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`L'examen ${collectionName}.gift a bien été créé. Vous pouvez le trouver ici :\n` +
                    `${process.cwd()}/${dataFolderPath}${collectionName}.gift`);
            }
        });

        this.ajouterQuestions(collectionPath);
    }

    /**
     * Vérifie la qualité des données d'examen.
     * @param {Array} questions - Liste des questions à analyser.
     */
    verifyQuality(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            console.error(chalk.red('La liste de questions est vide ou invalide.'));
            return;
        }
    
        // Vérification du nombre de questions
        const questionCount = questions.length;
        if (questionCount < 15 || questionCount > 20) {
            console.warn(chalk.red(`Nombre de questions invalide (${questionCount}).`));
            console.log(`L'examen doit contenir entre 15 et 20 questions.`)
        } else {
            console.log(chalk.green(`Nombre de questions valide (${questionCount}).`));
        }
    
        // Vérification des doublons (basée sur l'ID des questions)
        const idSet = new Set();
        const duplicateIds = [];
        questions.forEach((question) => {
            if (idSet.has(question.id)) {
                duplicateIds.push(question.id);
            } else {
                idSet.add(question.id);
            }
        });
    
        if (duplicateIds.length > 0) {
            console.error(chalk.red(`Des doublons ont été détectés pour les IDs suivants : ${duplicateIds.join(', ')}`));
        } else {
            console.log(chalk.green('Aucun doublon détecté.'));
        }
    
        // Résumé
        if (duplicateIds.length === 0 && questionCount >= 15 && questionCount <= 20) {
            console.log(chalk.green('✔ L’examen est valide.'));
        } else {
            console.warn(chalk.red('✘ L’examen contient des erreurs.'));
        }
    }

    /**
     * Compte le nombre de questions de chaque type dans un fichier de collection.
     * @param {string} collectionName - Nom de la collection (sans extension).
     * @returns {Object} - Nombre de questions par type
     */
    genererStats(collectionName) {
        const collectionPath = path.join(dataFolderPath, `${collectionName}.gift`);
        try {
            const data = fs.readFileSync(collectionPath, 'utf8'); // Synchronous file read
            const questions = this.chargeExamQuestions(data, collectionPath, false);
            let stats = {
                vrai_faux : 0,
                ouverte : 0,
                texte : 0,
                match : 0,
                numerique : 0,
                mot_manquant : 0,
                qcml : 0,
                qcm2 : 0,
                inconnu : 0
            };
            for (let index in questions){
                switch (questions[index].typeDeQuestion){
                    case 'vrai_faux' :
                        stats.vrai_faux ++
                        break
                    case 'ouverte' :
                        stats.ouverte ++
                        break
                    case 'texte' :
                        stats.texte ++
                        break
                    case 'match' :
                        stats.match ++
                        break
                    case "numerique" :
                        stats.numerique ++
                        break
                    case "mot_manquant" :
                        stats.mot_manquant ++
                        break
                    case "qcml" :
                        stats.qcml ++
                        break
                    case "qcm2" :
                        stats.qcm2 ++
                        break
                    default :
                        stats.inconnu ++
                        break
                }
            }
            return stats;

        } catch (err) {
            console.error('Erreur de lecture du fichier :', err);
            return 0; 
        }
        
    }
}

module.exports = CollectionQuestions;
