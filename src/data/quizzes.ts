export const QUIZZES: {
  category: string;
  question: string;
  options: string[];
  answer: number;
}[] = [
  // ══════════════════════════════════════════════════════════════════
  //  MATHS (12 questions)
  // ══════════════════════════════════════════════════════════════════
  {
    category: 'Maths',
    question: 'What is 7 x 8?',
    options: ['48', '54', '56', '64'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'What is 123 + 456?',
    options: ['569', '579', '589', '679'],
    answer: 1,
  },
  {
    category: 'Maths',
    question: 'What is half of 64?',
    options: ['28', '30', '32', '36'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'Which fraction is the same as 0.5?',
    options: ['1/3', '1/4', '1/2', '2/3'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'What is 9 x 6?',
    options: ['45', '54', '56', '63'],
    answer: 1,
  },
  {
    category: 'Maths',
    question: 'A baker has 36 cupcakes. He puts them equally into 4 boxes. How many are in each box?',
    options: ['7', '8', '9', '10'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'What is 1000 - 367?',
    options: ['633', '643', '637', '667'],
    answer: 0,
  },
  {
    category: 'Maths',
    question: 'What is 3/4 of 20?',
    options: ['12', '14', '15', '16'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'How many minutes are in 2 hours?',
    options: ['100', '120', '140', '200'],
    answer: 1,
  },
  {
    category: 'Maths',
    question: 'What is the next number in the pattern: 2, 5, 8, 11, ...?',
    options: ['12', '13', '14', '15'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'What is 12 x 12?',
    options: ['124', '132', '144', '148'],
    answer: 2,
  },
  {
    category: 'Maths',
    question: 'A shop sells apples for 30p each. How much do 5 apples cost?',
    options: ['£1.00', '£1.20', '£1.50', '£1.80'],
    answer: 2,
  },

  // ══════════════════════════════════════════════════════════════════
  //  ENGLISH (11 questions)
  // ══════════════════════════════════════════════════════════════════
  {
    category: 'English',
    question: 'Which word is spelled correctly?',
    options: ['becuase', 'because', 'becauce', 'becouse'],
    answer: 1,
  },
  {
    category: 'English',
    question: 'What is a synonym for "happy"?',
    options: ['Sad', 'Angry', 'Joyful', 'Tired'],
    answer: 2,
  },
  {
    category: 'English',
    question: 'Which word is a noun?',
    options: ['Run', 'Beautiful', 'Castle', 'Quickly'],
    answer: 2,
  },
  {
    category: 'English',
    question: 'What does the prefix "un-" mean?',
    options: ['Again', 'Before', 'Not', 'After'],
    answer: 2,
  },
  {
    category: 'English',
    question: 'Which sentence uses correct punctuation?',
    options: [
      'the dog ran fast',
      'The dog ran fast.',
      'The dog ran fast',
      'the Dog ran fast.',
    ],
    answer: 1,
  },
  {
    category: 'English',
    question: 'What is the plural of "child"?',
    options: ['Childs', 'Childes', 'Children', 'Childrens'],
    answer: 2,
  },
  {
    category: 'English',
    question: 'Which word is an adjective?',
    options: ['Slowly', 'Enormous', 'Jump', 'Table'],
    answer: 1,
  },
  {
    category: 'English',
    question: 'What is the past tense of "run"?',
    options: ['Runned', 'Ran', 'Running', 'Runs'],
    answer: 1,
  },
  {
    category: 'English',
    question: 'Which word means the opposite of "brave"?',
    options: ['Strong', 'Cowardly', 'Bold', 'Fierce'],
    answer: 1,
  },
  {
    category: 'English',
    question: 'What type of word is "quickly"?',
    options: ['Noun', 'Verb', 'Adjective', 'Adverb'],
    answer: 3,
  },
  {
    category: 'English',
    question: 'Which word is spelled correctly?',
    options: ['diffrent', 'diferent', 'different', 'differant'],
    answer: 2,
  },

  // ══════════════════════════════════════════════════════════════════
  //  SCIENCE (11 questions)
  // ══════════════════════════════════════════════════════════════════
  {
    category: 'Science',
    question: 'Which planet is closest to the Sun?',
    options: ['Venus', 'Earth', 'Mercury', 'Mars'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'What is the force that pulls objects towards the Earth?',
    options: ['Magnetism', 'Friction', 'Gravity', 'Air resistance'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'Which material is a conductor of electricity?',
    options: ['Wood', 'Rubber', 'Copper', 'Plastic'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'What do plants need to make food?',
    options: [
      'Darkness and soil',
      'Sunlight, water and carbon dioxide',
      'Only water',
      'Only soil',
    ],
    answer: 1,
  },
  {
    category: 'Science',
    question: 'Which animal is a mammal?',
    options: ['Snake', 'Dolphin', 'Frog', 'Eagle'],
    answer: 1,
  },
  {
    category: 'Science',
    question: 'How many bones does an adult human have?',
    options: ['106', '156', '206', '256'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'What is water made of?',
    options: [
      'Hydrogen and oxygen',
      'Carbon and oxygen',
      'Nitrogen and hydrogen',
      'Just oxygen',
    ],
    answer: 0,
  },
  {
    category: 'Science',
    question: 'Which state of matter has a fixed shape?',
    options: ['Gas', 'Liquid', 'Solid', 'Plasma'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'What is the largest organ in the human body?',
    options: ['Heart', 'Brain', 'Liver', 'Skin'],
    answer: 3,
  },
  {
    category: 'Science',
    question: 'What gas do humans breathe out?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'],
    answer: 2,
  },
  {
    category: 'Science',
    question: 'Which planet is known as the Red Planet?',
    options: ['Jupiter', 'Saturn', 'Mars', 'Venus'],
    answer: 2,
  },
];
