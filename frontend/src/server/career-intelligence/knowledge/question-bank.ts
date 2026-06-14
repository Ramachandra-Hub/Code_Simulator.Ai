export const QUESTION_BANK: Record<string, string[]> = {
  hr: [
    "Tell me about yourself and why you're interested in this role.",
    "Why should we hire you over other candidates?",
    "Where do you see yourself in 3-5 years?",
    "What are your greatest strengths and weaknesses?",
    "Why do you want to join our company?",
  ],
  technical: [
    "Walk me through a challenging project on your resume.",
    "Explain the difference between SQL and NoSQL databases.",
    "How would you design a rate limiter?",
    "What is the CAP theorem and how does it affect system design?",
    "Describe how you would debug a production issue.",
  ],
  behavioral: [
    "Tell me about a time you faced a tight deadline. (STAR format)",
    "Describe a conflict with a team member and how you resolved it.",
    "Give an example of when you took initiative without being asked.",
    "Tell me about a failure and what you learned from it.",
  ],
  coding: [
    "Find two numbers in an array that sum to a target.",
    "Detect a cycle in a linked list.",
    "Implement binary search and discuss its complexity.",
    "Explain BFS vs DFS and when to use each.",
  ],
  system_design: [
    "Design a URL shortener like bit.ly.",
    "Design a notification system for millions of users.",
    "Design a chat application for 1M concurrent users.",
    "Explain how you would scale a placement portal.",
  ],
};
