const fs = require('fs');
const path = require('path');
const readline = require('readline');
const GiftParser = require('./GiftParser');

class Examen {
    async simulate(nomExam) {
        try {
            const cheminFichier = path.resolve(`./data/gift/${nomExam}.gift`);
            if (!fs.existsSync(cheminFichier)) {
                console.error(`Erreur : Le fichier "${nomExam}.gift" n'existe pas.`);
                return;
            }

            const contenuFichier = fs.readFileSync(cheminFichier, 'utf8');
            const parser = new GiftParser();
            const questions = parser.parse(contenuFichier, nomExam);

            if (questions.length === 0) {
                console.error('Aucune question valide trouvée dans le fichier.');
                return;
            }

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            const givenAnswers = [];
            let score = 0;
            let nbQuestions = 0;
            let openQuestions = 0;

            const poserQuestion = (index) => {
                if (index >= questions.length) {
                    rl.close();
                    this.afficherBilan(questions, givenAnswers, score, nbQuestions, openQuestions);
                    return;
                }

                const question = questions[index];
                console.log(`\n=== Question ${index + 1} : ${question.titre || 'Sans titre'} ===`);
                console.log(question.texte);

                switch (question.typeDeQuestion) {
                    case 'choix_multiple':
                        question.reponses.forEach((option, i) => {
                            console.log(`${i + 1}. ${option}`);
                        });
                        rl.question('Votre réponse (indices séparés par des virgules) : ', (reponse) => {
                            const reponsesUtilisateur = reponse
                                .split(',')
                                .map((r) => question.reponses[parseInt(r.trim(), 10) - 1]);
                            givenAnswers.push(reponsesUtilisateur);
                            score += this.calculerPoints(question, reponsesUtilisateur);
                            nbQuestions++;
                            poserQuestion(index + 1);
                        });
                        break;

                    case 'vrai_faux':
                        rl.question('Votre réponse (true/false) : ', (reponse) => {
                            givenAnswers.push(reponse.toLowerCase());
                            score += this.calculerPoints(question, [reponse.toLowerCase()]);
                            nbQuestions++;
                            poserQuestion(index + 1);
                        });
                        break;

                    case 'numerique':
                        rl.question('Votre réponse (nombre) : ', (reponse) => {
                            givenAnswers.push(reponse);
                            score += this.calculerPoints(question, [reponse]);
                            nbQuestions++;
                            poserQuestion(index + 1);
                        });
                        break;

                    case 'mot_manquant':
                        rl.question('Complétez la phrase : ', (reponse) => {
                            givenAnswers.push(reponse);
                            score += this.calculerPoints(question, [reponse]);
                            nbQuestions++;
                            poserQuestion(index + 1);
                        });
                        break;

                    case 'match':
                        console.log('Associez les éléments suivants :');
                        question.reponses.forEach((pair, i) => {
                            console.log(`${i + 1}. ${pair}`);
                        });
                        const reponsesUtilisateur = [];
                        question.bonnesReponses.forEach((bonneReponse, i) => {
                            rl.question(`-> ${bonneReponse} correspond à : `, (reponse) => {
                                reponsesUtilisateur.push(reponse);
                                if (i === question.bonnesReponses.length - 1) {
                                    givenAnswers.push(reponsesUtilisateur);
                                    score += this.calculerPoints(question, reponsesUtilisateur);
                                    nbQuestions++;
                                    poserQuestion(index + 1);
                                }
                            });
                        });
                        break;

                    default:
                        console.log('Type de question non supporté ou correction manuelle requise.');
                        givenAnswers.push(null);
                        openQuestions++;
                        poserQuestion(index + 1);
                        break;
                }
            };

            poserQuestion(0);
        } catch (error) {
            console.error(`Erreur lors de la simulation : ${error.message}`);
        }
    }

    calculerPoints(question, reponsesUtilisateur) {
        let points = 0;
        if (['choix_multiple', 'vrai_faux', 'numerique'].includes(question.typeDeQuestion)) {
            question.bonnesReponses.forEach((bonneReponse) => {
                if (reponsesUtilisateur.includes(bonneReponse)) {
                    points += 1;
                }
            });
        } else if (question.typeDeQuestion === 'match') {
            question.bonnesReponses.forEach((bonneReponse, index) => {
                if (reponsesUtilisateur[index] === bonneReponse) {
                    points += 1;
                }
            });
        }
        return points;
    }

    afficherBilan(questions, givenAnswers, score, nbQuestions, openQuestions) {
        console.log('\n=== Bilan de l\'examen ===');
        questions.forEach((question, index) => {
            console.log(`\nQuestion ${index + 1} : ${question.titre || 'Sans titre'}`);
            console.log(`Votre réponse : ${givenAnswers[index]}`);
            console.log(`Bonne réponse : ${question.bonnesReponses.join(', ')}`);
        });

        console.log(`\nScore total : ${score} / ${nbQuestions}`);
        console.log(`${openQuestions} question(s) nécessite(nt) une correction manuelle.`);
    }
}

module.exports = Examen;
