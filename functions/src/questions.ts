/**
 * English Placement Test Question Data
 */

export interface MCQQuestion {
  id: string;
  type: 'mcq';
  text: string;
  options: string[];
  answer: string;
}

export interface BlankQuestion {
  id: string;
  type: 'blank';
  text: string;
  answer: string; // The correct exact word/number
}

export const LISTENING_PART_1: MCQQuestion[] = [
  {
    id: 'l1_1',
    type: 'mcq',
    text: "What's Lisa's surname?",
    options: ["Berardelli", "Bernardeli", "Bianardelli"],
    answer: "A"
  },
  {
    id: 'l1_2',
    type: 'mcq',
    text: "What room has Lisa booked?",
    options: ["double", "twin", "single"],
    answer: "C"
  },
  {
    id: 'l1_3',
    type: 'mcq',
    text: "What was the problem with the reservation?",
    options: [
      "Lisa booked a different room",
      "The computer didn't show a reservation",
      "The receptionist made a mistake"
    ],
    answer: "C"
  },
  {
    id: 'l1_4',
    type: 'mcq',
    text: "Where can Lisa have dinner today?",
    options: ["In the dining area", "In the restaurant", "In her room"],
    answer: "C"
  },
  {
    id: 'l1_5',
    type: 'mcq',
    text: "What time will Lisa check out tomorrow?",
    options: ["12 pm", "11 am", "Before 11 am"],
    answer: "A"
  },
  {
    id: 'l1_6',
    type: 'mcq',
    text: "What does Lisa ask the receptionist?",
    options: [
      "She asks her to wake her up tomorrow.",
      "She asks her for a phone charger.",
      "She asks her to let her charge her phone."
    ],
    answer: "A"
  },
  {
    id: 'l1_7',
    type: 'mcq',
    text: "What time does Lisa want to get up tomorrow?",
    options: ["7:00 am", "7:30 am", "8:00 am"],
    answer: "B"
  }
];

export const LISTENING_PART_2: BlankQuestion[] = [
  {
    id: 'l2_1',
    type: 'blank',
    text: "Available date: (1) ....................",
    answer: "May 5th"
  },
  {
    id: 'l2_2',
    type: 'blank',
    text: "Prices Rent: $ (2) .................... per month",
    answer: "1700"
  },
  {
    id: 'l2_3',
    type: 'blank',
    text: "Credit check: $ (3) ....................",
    answer: "15"
  },
  {
    id: 'l2_4',
    type: 'blank',
    text: "A remodelled (4) ....................",
    answer: "Kitchen"
  },
  {
    id: 'l2_5',
    type: 'blank',
    text: "No (5) ....................",
    answer: "Dishwasher"
  },
  {
    id: 'l2_6',
    type: 'blank',
    text: "Parking: A (6) .................... with a work area",
    answer: "Garage"
  },
  {
    id: 'l2_7',
    type: 'blank',
    text: "Garden care: The landlord will provide landscaping service, but the tenants must (7) .................... the grass.",
    answer: "Water"
  },
  {
    id: 'l2_8',
    type: 'blank',
    text: "The tenants should pay $15 for trashing and (8) .................... service.",
    answer: "Recycling"
  },
  {
    id: 'l2_9',
    type: 'blank',
    text: "Air conditioning: There is no central air conditioning, but there is a (9) .................... conditioning unit.",
    answer: "Window"
  },
  {
    id: 'l2_10',
    type: 'blank',
    text: "Student's name: Sam (10) ....................",
    answer: "Dressler"
  }
];

export const SPEAKING_READ_ALOUD = {
  text: "The local English placement test requires great focus, structured logic, and outstanding speaking skills. You must speak clearly and steadily into the microphone to describe the situation with rich details. Every single candidate wants to demonstrate their best potential to evaluate their listening, speaking, grammar, and reading capacities. Do not feel anxious or rush; just read this comprehensive paragraph naturally with confident pronunciation and proper sentence intonation. Remember that maintaining a consistent speed, pronouncing clear vowels, and utilizing natural rhythm are extremely helpful elements to achieve a high score in this speaking test.",
  wordCount: 91
};

export const SPEAKING_QUESTIONS = [
  { id: 'sp_1', text: "Do you like watching movies?" },
  { id: 'sp_2', text: "Is it important to play sports?" },
  { id: 'sp_3', text: "Why do many young people prefer living in the cities?" }
];

export const GRAMMAR_QUESTIONS: (MCQQuestion | BlankQuestion)[] = [
  {
    id: 'g_1',
    type: 'blank',
    text: "Yesterday, Linda ________ (visit) her grandparents.",
    answer: "visited"
  },
  {
    id: 'g_2',
    type: 'blank',
    text: "Last weekend, my brother ________ (go) fishing with his friends.",
    answer: "went"
  },
  {
    id: 'g_3',
    type: 'blank',
    text: "I ________ (never / try) Japanese food before.",
    answer: "Have never tried"
  },
  {
    id: 'g_4',
    type: 'blank',
    text: "My father usually ________ (go) to work by bus.",
    answer: "goes"
  },
  {
    id: 'g_5',
    type: 'blank',
    text: "She bought a ________ (beauty) dress for the party.",
    answer: "beautiful"
  },
  {
    id: 'g_6',
    type: 'blank',
    text: "The students listened ________ (care) to the teacher.",
    answer: "Carefully"
  },
  {
    id: 'g_7',
    type: 'mcq',
    text: "The test was ________ easy, so everyone finished early.",
    options: ["extreme", "extremely", "extremeness", "more extreme"],
    answer: "B"
  },
  {
    id: 'g_8',
    type: 'mcq',
    text: "My family moved to this city ________ 2021.",
    options: ["on", "at", "in", "for"],
    answer: "C"
  },
  {
    id: 'g_9',
    type: 'blank',
    text: "My teacher suggested ________ (read) more English books.",
    answer: "reading"
  },
  {
    id: 'g_10',
    type: 'mcq',
    text: "My parents always support ________.",
    options: ["I", "my", "me", "mine"],
    answer: "C"
  },
  {
    id: 'g_11',
    type: 'mcq',
    text: "This backpack is not Tom's. It's ________.",
    options: ["my", "mine", "me", "I"],
    answer: "B"
  },
  {
    id: 'g_12',
    type: 'mcq',
    text: "The woman ________ lives next door is a doctor.",
    options: ["which", "whose", "who", "where"],
    answer: "C"
  },
  {
    id: 'g_13',
    type: 'mcq',
    text: "This is the restaurant ________ we had dinner yesterday.",
    options: ["where", "who", "which", "whose"],
    answer: "A"
  },
  {
    id: 'g_14',
    type: 'mcq',
    text: "The boy ________ over there is my cousin.",
    options: ["standing", "stood", "stands", "which stand"],
    answer: "A"
  },
  {
    id: 'g_15',
    type: 'mcq',
    text: "________ every day is good for your health.",
    options: ["Walk", "Walking", "Walked", "To walked"],
    answer: "B"
  },
  {
    id: 'g_16',
    type: 'mcq',
    text: "This exercise is ________ than the previous one.",
    options: ["more easy", "easiest", "easier", "easily"],
    answer: "C"
  },
  {
    id: 'g_17',
    type: 'mcq',
    text: "Among all the runners, Lisa finished the race ________.",
    options: ["fast", "faster", "fastest", "the fastest"],
    answer: "D"
  },
  {
    id: 'g_18',
    type: 'mcq',
    text: "I stayed at home ________ it was raining heavily.",
    options: ["because", "although", "so", "but"],
    answer: "A"
  },
  {
    id: 'g_19',
    type: 'mcq',
    text: "Tom studied hard, ________ he passed the final exam.",
    options: ["because", "although", "so", "if"],
    answer: "C"
  },
  {
    id: 'g_20',
    type: 'mcq',
    text: "If she had left earlier, she ________ the train.",
    options: ["would catch", "would have caught", "caught", "will catch"],
    answer: "B"
  },
  {
    id: 'g_21',
    type: 'mcq',
    text: "If I ________ enough money, I would buy a new laptop.",
    options: ["have", "had", "will have", "had had"],
    answer: "B"
  },
  {
    id: 'g_22',
    type: 'mcq',
    text: "________ I you, I would learn another foreign language.",
    options: ["Have", "Was", "Were", "If were"],
    answer: "C"
  },
  {
    id: 'g_23',
    type: 'mcq',
    text: "There aren't many ________ in the library today.",
    options: ["student", "students", "student's", "studentes"],
    answer: "B"
  },
  {
    id: 'g_24',
    type: 'mcq',
    text: "My sister spends two hours ________ English every evening.",
    options: ["study", "studying", "to study", "studied"],
    answer: "B"
  },
  {
    id: 'g_25',
    type: 'mcq',
    text: "After a few weeks of exercise, he became much ________.",
    options: ["strong", "stronger", "strongly", "strength"],
    answer: "B"
  },
  {
    id: 'g_26',
    type: 'mcq',
    text: "It is important ________ enough water every day.",
    options: ["drink", "drinking", "to drink", "drank"],
    answer: "C"
  },
  {
    id: 'g_27',
    type: 'mcq',
    text: "________ about the traffic jam, we would have left home earlier.",
    options: ["If we knew", "Had we known", "Were we knowing", "Having known"],
    answer: "B"
  },
  {
    id: 'g_28',
    type: 'mcq',
    text: "The students ________ the international competition were invited to meet the principal.",
    options: ["winning", "won", "having won", "who winning"],
    answer: "A"
  },
  {
    id: 'g_29',
    type: 'mcq',
    text: "Not only ________ the report on time, but she also gave an excellent presentation.",
    options: ["she finished", "did she finish", "finish", "finished"],
    answer: "B"
  },
  {
    id: 'g_30',
    type: 'mcq',
    text: "Neither the manager nor the employees who work in the marketing department ________ aware of the new policy.",
    options: ["is", "are", "was", "has been"],
    answer: "B"
  }
];

export const VOCABULARY_QUESTIONS: MCQQuestion[] = [
  // A1
  {
    id: 'v_1',
    type: 'mcq',
    text: "Every morning, I go to the ________ to read books and borrow novels.",
    options: ["library", "hospital", "supermarket", "factory"],
    answer: "A"
  },
  {
    id: 'v_2',
    type: 'mcq',
    text: "My brother goes to school by ________ because it is cheap and good for his health.",
    options: ["bicycle", "airplane", "ship", "taxi"],
    answer: "A"
  },
  {
    id: 'v_3',
    type: 'mcq',
    text: "I didn't eat breakfast, so now I feel very ________.",
    options: ["hungry", "busy", "expensive", "early"],
    answer: "A"
  },
  // A2
  {
    id: 'v_4',
    type: 'mcq',
    text: "Can you ________ me the dictionary? I forgot mine at home.",
    options: ["lend", "borrow", "sell", "return"],
    answer: "A"
  },
  {
    id: 'v_5',
    type: 'mcq',
    text: "Please speak more ________. I can't hear what you are saying.",
    options: ["loudly", "slowly", "quietly", "carefully"],
    answer: "A"
  },
  {
    id: 'v_6',
    type: 'mcq',
    text: "Could you ________ me a favour and carry this heavy box?",
    options: ["make", "do", "take", "give"],
    answer: "B"
  },
  {
    id: 'v_7',
    type: 'mcq',
    text: "My cousin has made great ________ in English since she started reading books every day.",
    options: ["progress", "experience", "information", "advice"],
    answer: "A"
  },
  {
    id: 'v_8',
    type: 'mcq',
    text: "Don't forget to ________ the lights before you leave the classroom.",
    options: ["pick up", "put on", "turn off", "take away"],
    answer: "C"
  },
  {
    id: 'v_9',
    type: 'mcq',
    text: "Tom was very ________ when he heard that he had won first prize.",
    options: ["disappointed", "surprised", "worried", "bored"],
    answer: "B"
  },
  // B1
  {
    id: 'v_10',
    type: 'mcq',
    text: "The company plans to ________ more workers next year because business is growing.",
    options: ["employ", "deploy", "find out", "retire"],
    answer: "A"
  },
  {
    id: 'v_11',
    type: 'mcq',
    text: "You should read the ________ carefully before taking this medicine.",
    options: ["instructions", "invitations", "suggestions", "introductions"],
    answer: "A"
  },
  {
    id: 'v_12',
    type: 'mcq',
    text: "The teacher asked us to work together to ________ the problem.",
    options: ["find", "look up", "celebrate", "address"],
    answer: "D"
  },
  {
    id: 'v_13',
    type: 'mcq',
    text: "Employees are expected to ________ with safety regulations at all times.",
    options: ["comply", "achieve", "contribute", "overcome"],
    answer: "A"
  },
  {
    id: 'v_14',
    type: 'mcq',
    text: "The meeting was ________ because the manager was ill.",
    options: ["looked after", "called off", "carried out", "taken over"],
    answer: "B"
  },
  {
    id: 'v_15',
    type: 'mcq',
    text: "The charity was established to provide ________ for children from low-income families.",
    options: ["equipment", "entertainment", "assistance", "evidence"],
    answer: "C"
  },
  // B2
  {
    id: 'v_16',
    type: 'mcq',
    text: "The company's success can largely be ________ to its highly skilled employees.",
    options: ["contributed", "attributed", "devoted", "adapted"],
    answer: "B"
  },
  {
    id: 'v_17',
    type: 'mcq',
    text: "Many experts believe that governments should ________ stricter measures to reduce carbon emissions.",
    options: ["impose", "attract", "persuade", "recover"],
    answer: "A"
  },
  {
    id: 'v_18',
    type: 'mcq',
    text: "With the rapid development of technology, change has become ________ in modern society.",
    options: ["flexible", "inevitable", "ordinary", "temporary"],
    answer: "B"
  },
  {
    id: 'v_19',
    type: 'mcq',
    text: "The government has introduced several ________ to encourage people to use renewable energy.",
    options: ["incentives", "occasions", "symptoms", "consequences"],
    answer: "A"
  },
  // C1
  {
    id: 'v_20',
    type: 'mcq',
    text: "The scientist was so ________ that he checked every detail of the experiment several times before publishing the results.",
    options: ["generous", "meticulous", "ambitious", "humorous"],
    answer: "B"
  },
  {
    id: 'v_21',
    type: 'mcq',
    text: "Spreading false information online can seriously ________ public trust in the government.",
    options: ["establish", "strengthen", "undermine", "improve"],
    answer: "C"
  },
  {
    id: 'v_22',
    type: 'mcq',
    text: "Obesity has become increasingly ________ among children due to unhealthy eating habits and a lack of exercise.",
    options: ["rare", "prevalent", "temporary", "accidental"],
    answer: "B"
  }
];

export const READING_PASSAGE = {
  title: "The Problem of Fast Fashion",
  text: `Many people enjoy buying new clothes because fashion changes quickly and prices are often low. However, this habit has created a serious environmental problem known as "fast fashion."

Fast fashion refers to clothing that is produced quickly and cheaply so that stores can keep up with the latest trends. Although this allows customers to buy fashionable clothes at affordable prices, it also encourages people to throw away clothes more frequently. As a result, millions of tons of textile waste are sent to landfills every year.

Producing clothes also requires a large amount of water and energy. For example, growing cotton consumes huge quantities of water, while factories often use chemicals that may pollute nearby rivers if they are not treated properly. In addition, transporting clothes from factories to shops around the world releases greenhouse gases into the atmosphere.

Fortunately, consumers can reduce these environmental impacts in several ways. Instead of buying new clothes every month, they can choose better-quality products that last longer. Repairing damaged clothes, buying used items, and donating unwanted clothing are also effective solutions. Although these actions may seem small, they can make a significant difference if many people take part.

Ultimately, governments, clothing companies, and consumers all have an important role in making the fashion industry more environmentally friendly.`,
  questionsPartA: [
    {
      id: 'r_1',
      type: 'mcq',
      text: "What is the main purpose of the passage?",
      options: [
        "To explain why fashion trends change rapidly",
        "To discuss the environmental effects of fast fashion and possible solutions",
        "To encourage people to become fashion designers",
        "To compare expensive and cheap clothing"
      ],
      answer: "B"
    },
    {
      id: 'r_2',
      type: 'mcq',
      text: "Which paragraph mainly discusses the causes of pollution during clothing production?",
      options: [
        "Paragraph 1",
        "Paragraph 2",
        "Paragraph 3",
        "Paragraph 4"
      ],
      answer: "C"
    }
  ],
  questionsPartB: [
    {
      id: 'r_3',
      type: 'mcq',
      text: "Fast fashion makes people buy clothes less often.",
      options: ["True", "False", "Not Given"],
      answer: "False"
    },
    {
      id: 'r_4',
      type: 'mcq',
      text: "Cotton production use a large amount of water.",
      options: ["True", "False", "Not Given"],
      answer: "True"
    },
    {
      id: 'r_5',
      type: 'mcq',
      text: "Most clothing factories use renewable energy.",
      options: ["True", "False", "Not Given"],
      answer: "Not Given"
    },
    {
      id: 'r_6',
      type: 'mcq',
      text: "Buying second-hand clothes is suggested as one solution.",
      options: ["True", "False", "Not Given"],
      answer: "True"
    }
  ]
};

export const WRITING_QUESTIONS = [
  { id: 'w_1', vietnamese: "Tập thể dục mỗi ngày giúp mọi người giữ gìn sức khỏe tốt." },
  { id: 'w_2', vietnamese: "Giáo viên cho phép học sinh sử dụng từ điển trong giờ học." },
  { id: 'w_3', vietnamese: "Nhiều gia đình dành thời gian tham gia các hoạt động ngoài trời vào cuối tuần." },
  { id: 'w_4', vietnamese: "Các thành phố nên trồng thêm cây để cải thiện chất lượng không khí." },
  { id: 'w_5', vietnamese: "Điện thoại thông minh, cái mà có thể sử dụng để liên lạc, cũng gây mất tập trung." },
  { id: 'w_6', vietnamese: "Những học sinh yêu thích lịch sử thường tham quan các bảo tàng vào cuối tuần." },
  { id: 'w_7', vietnamese: "Học sinh tham gia các câu lạc bộ thường phát triển kỹ năng giao tiếp nhanh hơn." },
  { id: 'w_8', vietnamese: "Mọi người nên bảo tồn các lễ hội truyền thống, vốn phản ánh lịch sử và văn hóa địa phương." },
  { id: 'w_9', vietnamese: "Mặc dù trí tuệ nhân tạo tiết kiệm thời gian, con người vẫn cần học cách sử dụng nó một cách thông minh/khôn khéo." },
  { id: 'w_10', vietnamese: "Việc giảm sử dụng nhựa dùng một lần có thể bảo vệ đại dương cho các thế hệ tương lai." }
];
