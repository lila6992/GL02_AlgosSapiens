const fs = require('fs');
const path = require('path');
const readline = require('readline');
const GiftParser = require('./GiftParser');

class Examen {
    constructor(questions) {
        this.questions = questions;
    }
    async simuler() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const givenAnswers = [];
        let score = 0;
        let totalQuestions = this.questions.length;
        for (let index = 0; index < this.questions.length; index++) {
            const question = this.questions[index];
            console.log(`\n${chalk.bold(`Question ${index + 1}:`)} ${question.titre}`);
            console.log(chalk.gray(question.texte));
            switch (question.typeDeQuestion) {
                case 'qcm1':
                    console.log(chalk.cyan('Choisissez la réponse correcte :'));
                    question.reponses.forEach((reponse, i) => {
                        console.log(`${i + 1}. ${reponse}`);
                    });
                    const reponseQCM = await this.poserQuestionQCM(rl, question);
                    givenAnswers.push(reponseQCM);
                    score += this.verifierReponseQCM(question, reponseQCM) ? 1 : 0;
                    break;
                case 'mot_manquant':
                    console.log(chalk.cyan('Choisissez le mot manquant :'));
                    question.reponses.forEach((reponse, i) => {
                        console.log(`${i + 1}. ${reponse}`);
                    });
                    const reponseMot = await this.poserQuestionMotManquant(rl, question);
                    givenAnswers.push(reponseMot);
                    score += this.verifierReponseMotManquant(question, reponseMot) ? 1 : 0;
                    break;
                case 'ouverte':
                    console.log(chalk.cyan('Choisissez le mot manquant :'));
                    question.reponses.forEach((reponse, i) => {
                        console.log(`${i + 1}. ${reponse}`);
                    });
                    const reponseOuverte = await this.poserQuestionOuverte(rl, question);
                    givenAnswers.push(reponseOuverte);
                    score += this.verifierReponseOuverte(question, reponseOuverte) ? 1 : 0;
                    break;
            }
        }
        rl.close();
        this.afficherBilan(this.questions, givenAnswers, score, totalQuestions);
    }
    poserQuestionQCM(rl, question) {
        return new Promise((resolve) => {
            rl.question('Votre réponse (numéro) : ', (reponse) => {
                const index = parseInt(reponse) - 1;
                resolve(index >= 0 && index < question.reponses.length ? question.reponses[index] : null);
            });
        });
    }
    verifierReponseQCM(question, reponse) {
        return question.bonnesReponses.includes(reponse);
    }
    poserQuestionMotManquant(rl, question) {
        return new Promise((resolve) => {
            rl.question('Votre réponse (numéro) : ', (reponse) => {
                const index = parseInt(reponse) - 1;
                resolve(index >= 0 && index < question.reponses.length ? question.reponses[index] : null);
            });
        });
    }
    verifierReponseMotManquant(question, reponse) {
        return question.bonnesReponses.includes(reponse);
    }
    poserQuestionMotManquant(rl, question) {
        return new Promise((resolve) => {
            rl.question('Votre réponse (numéro) : ', (reponse) => {
                const index = parseInt(reponse) - 1;
                resolve(index >= 0 && index < question.reponses.length ? question.reponses[index] : null);
            });
        });
    }
    verifierReponseOuverte(question, reponse) {
        return question.bonnesReponses.includes(reponse);
    }
    afficherBilan(questions, givenAnswers, score, totalQuestions) {
        console.log(`\n${chalk.bold('=== Bilan de l\'examen ===')}`)
        console.log(`${chalk.green('Score :')} ${score} / ${totalQuestions}`);
        questions.forEach((question, index) => {
            console.log(`\n${chalk.bold(`Question ${index + 1} :`)} ${question.titre}`);
            console.log(`${chalk.gray('Votre réponse :')} ${givenAnswers[index] || 'Pas de réponse'}`);
            console.log(`${chalk.cyan('Bonnes réponses :')} ${question.bonnesReponses.join(', ')}`);
        });
    }
}
module.exports = Examen;