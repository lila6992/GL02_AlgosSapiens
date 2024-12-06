const fs = require('fs');
const writeFile = require('fs').promises.writeFile;
const chalk = require('chalk');
const path = require('path');
const GiftParser = require('./GiftParser');
const { CollectionQuestion, Question } = require('./Question');

const tempStoragePath = path.join(__dirname, 'data', 'temp_selected_questions.json');
const personalCollectionPath = path.join(__dirname, 'data', 'personal_collection.json');
const dataFolderPath = path.join(__dirname, 'data', 'gift');

class CollectionQuestions {
    constructor(nomFichier) {
        this.nomFichier = nomFichier;
        this.questions = new CollectionQuestion();
    }
    
    chargeExamQuestions = function (data, file, check) {
        const parser = new GiftParser();
        parser.parse(data, file); 

        const parsedQuestions = parser.parse(data, file);
        if (check == true) {parser.checkFormat(file);}
        this.questions = parsedQuestions;
        return parsedQuestions;
    }

    chargeAllFolderQuestions(dataFolderPath, check) {
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
    
    logQuestions = function (questions) {
        const transformType = (typeDeQuestion) => {
            switch (typeDeQuestion) {
                case 'qcml':
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
            console.log(chalk.bold(`formatGift : `) + chalk.gray(transformType(question.formatGift) || 'No format gift available'));
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

    search(questions, searchKey) {
        return questions.filter(q => 
            (q.titre && q.titre.toLowerCase().includes(searchKey.toLowerCase())) ||
            (q.texte && q.texte.toLowerCase().includes(searchKey.toLowerCase()))
        );
    }

    selectQuestionsFromId = function (questions, id, tempStoragePath) {
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

    ajouterQuestions(collectionPath, tempStoragePath) {
        fs.readFile(collectionPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Erreur de lecture du fichier :', err);
                return;
            }
            const collectionQuestions = this.chargeExamQuestions(data, collectionPath, false);
    
            // Read the temporary storage to ensure no duplicate IDs are added
            fs.readFile(tempStoragePath, 'utf8', (err, data) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Erreur de lecture du fichier :', err);
                    return;
                }
    
                let selectedQuestions = [];
                if (data) {
                    try {
                        selectedQuestions = JSON.parse(data); // Parse selected questions if the file exists
                    } catch (e) {
                        console.error('Erreur de parsing JSON :', e);
                        return;
                    }
                }
                this.logQuestions(selectedQuestions);
    
                // Convert questions to GIFT format and write them
                const contenuGIFT = selectedQuestions.map(q => {
                    return `::${q.formatGift}`;  // Add "::" before the formatGift for each question
                }).join('\n\n');  // Join each question with two new lines for separation
    
                // Append the new questions to the end of the existing collection file
                fs.appendFileSync(collectionPath, '\n\n' + contenuGIFT, 'utf-8');  // Ensure two new lines before appending
                console.log(`Nouvelles questions ajoutées au fichier GIFT : ${collectionPath}`);
            });
        });
    }

    
    createCollection(dataFolderPath, name) {
        const filenames = fs.readdirSync(dataFolderPath);

        // Vérification que le fichier n'existe pas déjà
        if (filenames.includes(`${name}.gift`)) {
            console.log(`L'examen ${name}.gift existe déjà. Vous pouvez le retrouver ici :\n` +
                `${process.cwd()}/${dataFolderPath}${name}.gift`);
            return;
        }

        // Création du fichier si nécessaire
        const collectionPath = `${dataFolderPath}/${name}.gift`;
        fs.writeFile(collectionPath, "", "utf8", (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`L'examen ${name}.gift a bien été créé. Vous pouvez le trouver ici :\n` +
                    `${process.cwd()}/${dataFolderPath}${name}.gift`);
            }
        });

        this.ajouterQuestions(collectionPath, tempStoragePath);
    }
    
}

module.exports = CollectionQuestions;
