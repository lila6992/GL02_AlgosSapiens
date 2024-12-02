class GiftParser {
    constructor(sTokenize, sParsedSymb) {
        this.symb = ["::", "{", "=", "~", "#", "}"];
        this.showTokenize = sTokenize;
        this.showParsedSymbols = sParsedSymb;
        this.errorCount = 0;
    }

    // Fonction pour vérifier si un fichier est au format GIFT
    isGiftFormat(data) {
        const giftPatterns = [
            { pattern: /::.*::/, error: "Titre de la question manquant ou mal formaté" },    // Recherche le titre de la question "::Question Title::"
            { pattern: /\{[^}]*\}/, error: "Bloc de réponses manquant ou mal formaté" },    // Recherche un bloc de réponses entre {}
            { pattern: /[=~#]/, error: "Réponse correcte ou incorrecte mal définie" }        // Recherche les symboles de réponse
        ];

        return giftPatterns.every(({ pattern, error }) => {
            if (!pattern.test(data)) {
                console.error(error);
                this.errorCount++;
                return false;
            }
            return true;
        });
    }

    tokenize(data) {
        const tokens = data.split(/\s+/);
        if (this.showTokenize) {
            console.log("Tokens : ", tokens);
        }
        return tokens;
    }

    parse(data) {
        if (this.isGiftFormat(data)) {
            this.tokenize(data);
        } else {
            console.error(`Le fichier n'est pas au format GIFT. Erreurs : ${this.errorCount}`);
        }
    }
}

module.exports = { GiftParser };
