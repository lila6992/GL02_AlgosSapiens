const fs = require('fs');
const writeFile = require('fs').promises.writeFile;
const chalk = require('chalk');
const path = require('path');
const GiftParser = require('./GiftParser');
const { CollectionQuestion, Question } = require('./Question');

class Examen {
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
        const transformType = (type) => {
            switch (type) {
                case 'qcml':
                    return 'Choix multiples';
                case 'vrai_faux':
                    return 'Vrai ou faux';
                case 'numérique':
                    return 'Numérique';
                default:
                    return type.charAt(0).toUpperCase() + type.slice(1);
            }
        };

        questions.forEach((question, index) => {
            console.log(`\n`);
            console.log(chalk.bold(`ID : `) + chalk.gray(String(question.id)));
            console.log(chalk.bold(`Fichier source : `) + chalk.gray(question.file));
            console.log(chalk.bold(`Question : `) + chalk.gray(String(question.questionIndex)));
            console.log(chalk.bold(`Titre : `) + chalk.gray(String(question.title)));
            console.log(chalk.bold(`Type : `) + chalk.gray(transformType(question.type)));
            console.log(chalk.bold(`Enoncé : `) + chalk.gray(question.statement));
        
            if (Array.isArray(question.answer) && question.answer.length > 0) {
                console.log(chalk.bold("Réponses :"));
                question.answer.forEach(ans => {
                    console.log(chalk.gray(`\t✔️ ${ans}`));
                });
            }
        
            if (Array.isArray(question.choice) && question.choice.length > 0) {
                console.log(chalk.bold("Autres choix :"));
                question.choice.forEach(indivChoice => {
                    console.log(chalk.gray(`\t❌ ${indivChoice}`));
                });
            }
        });
    }

    search(questions, searchKey) {
        return questions.filter(q => 
            (q.title && q.title.toLowerCase().includes(searchKey.toLowerCase())) ||
            (q.statement && q.statement.toLowerCase().includes(searchKey.toLowerCase()))
        );
    }

    selectQuestionsFromId = function (questions, id, tempStoragePath) {
        const filteredQuestions = questions.filter(question => question?.id === id);
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

                    // Ajouter les nouvelles questions aux questions existantes
                    let existingSelectedQuestions = [];
                    try {
                        existingSelectedQuestions = JSON.parse(data); // Parser les données existantes
                    } catch (e) {
                        console.error('Erreur de parsing JSON :', e);
                    }
                    existingSelectedQuestions.push(...filteredQuestions);

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
    }


    /**
     * Vérifie la validité de l'examen selon les critères définis.
     * @returns {Object} - Résultat de la vérification (booléen et détails).
     */
    verifierQualite() {
        const erreurs = [];

        // Vérifie le nombre de questions
        const nombreQuestions = this.questions.questions.length;
        if (nombreQuestions < 15) {
            erreurs.push(`L'examen contient trop peu de questions (${nombreQuestions}). Minimum requis : 15.`);
        } else if (nombreQuestions > 20) {
            erreurs.push(`L'examen contient trop de questions (${nombreQuestions}). Maximum permis : 20.`);
        }

        // Vérifie les doublons
        const titres = this.questions.questions.map(q => q.titre);
        const doublons = titres.filter((titre, index) => titres.indexOf(titre) !== index);
        if (doublons.length > 0) {
            erreurs.push(`L'examen contient des doublons : ${[...new Set(doublons)].join(', ')}.`);
        }

        return {
            valide: erreurs.length === 0,
            erreurs,
        };
    }
}

module.exports = Examen;
