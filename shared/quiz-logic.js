// The end-of-day quiz: a few questions on the history the day just showed.
// Each question checks one card's historical note; in the data the first
// option is the right one, and the options are shuffled here. Pure.

/**
 * Pick `count` questions, preferring the ones about facts seen today, and
 * shuffle each question's options. Returns [{ id, factId, q, options, answer }].
 */
export function pickQuiz(quiz = [], factIdsSeen = [], rng = Math.random, count = 3) {
  const seen = new Set(factIdsSeen);
  const shuffled = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const fromToday = shuffled(quiz.filter(question => seen.has(question.factId)));
  const others = shuffled(quiz.filter(question => !seen.has(question.factId)));
  return [...fromToday, ...others].slice(0, count).map(question => {
    const order = shuffled(question.options.map((option, index) => index));
    return {
      id: question.id,
      factId: question.factId,
      q: question.q,
      options: order.map(index => question.options[index]),
      answer: order.indexOf(0),
    };
  });
}

/** Score a set of answers (indices, or null for unanswered). */
export function scoreQuiz(questions, answers) {
  const correct = questions.filter((question, index) => answers[index] === question.answer).length;
  return { correct, total: questions.length, perfect: questions.length > 0 && correct === questions.length };
}
