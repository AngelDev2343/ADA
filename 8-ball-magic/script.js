const answers = ["Sí", "No", "Tal vez", "Probablemente sí", "Probablemente no", "Pregunta otra vez"];
const form = document.getElementById("askForm");
const questionInput = document.getElementById("question");
const ball = document.getElementById("ball");
const answerText = document.getElementById("answerText");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (questionInput.value.trim() === "") {
    questionInput.classList.remove("error");
    void questionInput.offsetWidth;
    questionInput.classList.add("error");
    questionInput.focus();
    return;
  }
  questionInput.classList.remove("error");
  questionInput.value = "";

  // la respuesta aparece cuando la bola deja de agitarse
  ball.classList.remove("answered", "shaking");
  void ball.offsetWidth;
  ball.classList.add("shaking");
  setTimeout(() => {
    answerText.textContent = answers[Math.floor(Math.random() * answers.length)];
    ball.classList.remove("shaking");
    ball.classList.add("answered");
  }, 600);
});
