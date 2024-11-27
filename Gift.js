var Gift = function(question, type, answerList, goodAnswer){
    this.question = question
    this.type = type
    this.answerList = answerList
    this.goodAnswer = goodAnswer
}

Gift.compare = function(q1,q2){
    //Todo
}

Gift.compareType = function(q1,q2){
    return q1.type === q2.type ? true : false;
}
Gift.testAnswer = function(q, goodAnswer){
    //Todo
}